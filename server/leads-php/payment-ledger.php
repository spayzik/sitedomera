<?php
declare(strict_types=1);

namespace Dekoray\Payments;

use Dekoray\Leads\LeadError;
use PDO;
use Throwable;
use function Dekoray\Leads\digest;
use const Dekoray\Leads\JSON_FLAGS;

final class PaymentLedger
{
    private readonly PDO $db;

    public function __construct(string $path, private readonly string $key)
    {
        $this->db = new PDO('sqlite:' . $path, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $this->db->exec('PRAGMA busy_timeout = 2500; PRAGMA synchronous = FULL; PRAGMA secure_delete = ON;');
        $this->db->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS payment_orders (
                id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, crm_order_id TEXT UNIQUE NOT NULL,
                shop_id TEXT NOT NULL, quote TEXT NOT NULL, email_cipher TEXT, expires_at INTEGER NOT NULL,
                access_until INTEGER NOT NULL, first_attempt_at INTEGER, idempotency_key TEXT UNIQUE NOT NULL,
                provider_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'awaiting_payment',
                paid_at INTEGER, refunded_minor INTEGER NOT NULL DEFAULT 0, confirmation_url TEXT,
                receipt_registration TEXT
            );
            CREATE TABLE IF NOT EXISTS payment_limits (
                subject TEXT NOT NULL, minute INTEGER NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY(subject, minute)
            );
            CREATE INDEX IF NOT EXISTS payment_limits_minute ON payment_limits(minute);
            SQL);
    }

    public function issue(string $id, string $token, string $orderId, string $shopId, array $quote, string $email, int $expires): void
    {
        $insert = $this->run(
            'INSERT INTO payment_orders (id, token_hash, crm_order_id, shop_id, quote, email_cipher, expires_at,
                access_until, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(crm_order_id) DO NOTHING',
            [$id, $this->tokenHash($token), $orderId, $shopId, json_encode($quote, JSON_FLAGS),
                $this->encryptEmail($id, $email), $expires, $expires + 7 * 86400, bin2hex(random_bytes(24))],
        );
        if ($insert->rowCount() !== 1) {
            throw new LeadError(409, 'order_already_issued');
        }
    }

    public function byToken(string $token): array
    {
        $row = $this->run('SELECT * FROM payment_orders WHERE token_hash = ? AND access_until > ?',
            [$this->tokenHash($token), time()])->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            throw new LeadError(404, 'order_not_found');
        }
        return $row;
    }

    public function attemptedOrder(string $id): ?array
    {
        $row = $this->run('SELECT * FROM payment_orders WHERE id = ? AND first_attempt_at IS NOT NULL', [$id])->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function byProviderId(string $id): ?array
    {
        $row = $this->run('SELECT * FROM payment_orders WHERE provider_id = ?', [$id])->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    public function registerAttempt(string $id): array
    {
        return $this->atomic(function () use ($id): array {
            $row = $this->row($id);
            if ($row['provider_id'] !== null) {
                return $row;
            }
            $now = time();
            if ($row['expires_at'] <= $now || $row['email_cipher'] === null ||
                ($row['first_attempt_at'] !== null && $row['first_attempt_at'] <= $now - 23 * 3600)) {
                throw new LeadError(410, 'quote_expired');
            }
            if ($row['first_attempt_at'] === null) {
                $this->run('UPDATE payment_orders SET first_attempt_at = ? WHERE id = ?', [$now, $id]);
                $row['first_attempt_at'] = $now;
            }
            return $row;
        });
    }

    public function confirm(array $row, array $verified): array
    {
        return $this->atomic(function () use ($row, $verified): array {
            $current = $this->row($row['id']);
            if ($current['first_attempt_at'] === null || ($current['provider_id'] !== null && $current['provider_id'] !== $verified['id'])) {
                throw new LeadError(503, 'provider_mismatch');
            }
            if ($current['paid_at'] !== null && $verified['status'] !== 'paid') {
                // A request for an older pending provider view can overtake a paid notification.
                if ($verified['status'] === 'pending') {
                    return $current;
                }
                throw new LeadError(503, 'provider_mismatch');
            }
            if ($current['status'] === 'canceled') {
                if ($verified['status'] !== 'paid') {
                    return $current;
                }
                throw new LeadError(503, 'provider_mismatch');
            }

            $paidAt = $current['paid_at'];
            $status = $verified['status'];
            $refund = max($current['refunded_minor'], $verified['refund']);
            if ($status === 'paid') {
                $paidAt ??= (int) floor(microtime(true) * 1000);
                if ($refund > 0) {
                    $status = $refund === $verified['total'] ? 'refunded' : 'partially_refunded';
                }
            }
            $receipt = $current['receipt_registration'] === 'succeeded' ? 'succeeded' : $verified['receipt'];
            $this->run('UPDATE payment_orders SET provider_id = ?, status = ?, paid_at = ?, refunded_minor = ?,
                    confirmation_url = ?, receipt_registration = ?, email_cipher = NULL WHERE id = ?',
                [$verified['id'], $status, $paidAt, $refund, $verified['confirmationUrl'], $receipt, $current['id']]);
            return $this->row($current['id']);
        });
    }

    /** Expire PII and temporary authorization without reusing an order ID. */
    public function clearExpiredContact(): void
    {
        $this->run('UPDATE payment_orders SET email_cipher = NULL WHERE expires_at <= ? AND email_cipher IS NOT NULL', [time()]);
    }

    public function pending(string $shopId): array
    {
        return $this->run("SELECT * FROM payment_orders WHERE shop_id = ? AND provider_id IS NOT NULL
            AND (status = 'pending' OR (status = 'paid' AND receipt_registration IS NOT 'succeeded'))
            ORDER BY COALESCE(paid_at, first_attempt_at * 1000), id LIMIT 20", [$shopId])->fetchAll(PDO::FETCH_ASSOC);
    }

    public function email(array $row): string
    {
        $encoded = base64_decode((string) $row['email_cipher'], true);
        $mail = is_string($encoded) && strlen($encoded) > 28
            ? openssl_decrypt(substr($encoded, 28), 'aes-256-gcm', $this->emailKey(), OPENSSL_RAW_DATA,
                substr($encoded, 0, 12), substr($encoded, 12, 16), $row['id']) : false;
        if (!is_string($mail)) {
            throw checkoutUnavailable();
        }
        return $mail;
    }

    public function consumeRate(string $scope, string $address): void
    {
        $minute = intdiv(time(), 60);
        $allowed = $this->atomic(function () use ($scope, $address, $minute): bool {
            $this->run('DELETE FROM payment_limits WHERE minute < ?', [$minute - 1]);
            return $this->hit($scope . ':global', $minute) <= 300 &&
                $this->hit($scope . ':' . digest($this->key, 'payment-rate', $address), $minute)
                    <= ($scope === 'notify' ? 120 : 30);
        });
        if (!$allowed) {
            throw new LeadError(429, 'rate_limit');
        }
    }

    private function hit(string $subject, int $minute): int
    {
        return (int) $this->run('INSERT INTO payment_limits VALUES (?, ?, 1)
            ON CONFLICT(subject, minute) DO UPDATE SET hits = hits + 1 RETURNING hits', [$subject, $minute])->fetchColumn();
    }

    private function row(string $id): array
    {
        $row = $this->run('SELECT * FROM payment_orders WHERE id = ?', [$id])->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            throw new LeadError(404, 'order_not_found');
        }
        return $row;
    }

    private function emailKey(): string
    {
        return hex2bin(digest($this->key, 'payment-encryption', 'v1'));
    }

    private function encryptEmail(string $id, string $email): string
    {
        $nonce = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($email, 'aes-256-gcm', $this->emailKey(), OPENSSL_RAW_DATA, $nonce, $tag, $id);
        if (!is_string($cipher)) {
            throw checkoutUnavailable();
        }
        return base64_encode($nonce . $tag . $cipher);
    }

    private function tokenHash(string $token): string
    {
        return digest($this->key, 'payment-access', $token);
    }

    private function run(string $sql, array $values): \PDOStatement
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($values);
        return $statement;
    }

    private function atomic(callable $operation): mixed
    {
        $this->db->exec('BEGIN IMMEDIATE');
        try {
            $value = $operation();
            $this->db->exec('COMMIT');
            return $value;
        } catch (Throwable $error) {
            $this->db->exec('ROLLBACK');
            throw $error;
        }
    }
}
