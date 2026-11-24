<?php
declare(strict_types=1);

namespace Dekoray\Leads;

use PDO;
use Throwable;

function digest(string $key, string $domain, string $data): string
{
    return hash_hmac('sha256', $domain . "\0" . $data, $key);
}

function syncId(string $key, string $domain, string $data): string
{
    $hex = digest($key, $domain, $data);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-4' . substr($hex, 13, 3)
        . '-8' . substr($hex, 17, 3) . '-' . substr($hex, 20, 12);
}

final class Ledger
{
    private PDO $db;

    public function __construct(string $path, private readonly string $hashKey, private readonly int $retentionDays)
    {
        $this->db = new PDO('sqlite:' . $path, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $this->db->exec('PRAGMA busy_timeout = 2000; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
        $this->db->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS operations (
                key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, consent_version TEXT NOT NULL,
                consent_at INTEGER NOT NULL, lease_until INTEGER NOT NULL, receipt_id TEXT
            );
            CREATE INDEX IF NOT EXISTS lead_operation_age ON operations (consent_at);
            CREATE INDEX IF NOT EXISTS lead_operation_replay ON operations (fingerprint, consent_at);
            CREATE TABLE IF NOT EXISTS operation_aliases (
                key TEXT PRIMARY KEY,
                operation_key TEXT NOT NULL REFERENCES operations(key) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS lead_alias_operation ON operation_aliases (operation_key);
            CREATE TABLE IF NOT EXISTS rate_limits (subject TEXT, bucket INTEGER, hits INTEGER, PRIMARY KEY(subject, bucket));
            CREATE INDEX IF NOT EXISTS lead_rate_age ON rate_limits (bucket);
            CREATE TABLE IF NOT EXISTS pending_delivery (
                operation_key TEXT PRIMARY KEY REFERENCES operations(key) ON DELETE CASCADE,
                payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS lead_delivery_due ON pending_delivery (next_at);
            SQL);
    }

    public function consumeRate(string $ip): void
    {
        $now = $this->now();
        $bucket = intdiv($now, 60_000);
        $allowed = $this->transaction(function () use ($bucket, $now, $ip): bool {
            $this->run('DELETE FROM rate_limits WHERE bucket < ?', [$bucket - 1]);
            $this->expirePending();
            // Never discard an unconfirmed upstream write just because its outcome is old.
            $this->run('DELETE FROM operations WHERE consent_at < ? AND receipt_id IS NOT NULL',
                [$now - $this->retentionDays * 86_400_000]);
            $global = $this->hit('global', $bucket);
            $local = $this->hit(digest($this->hashKey, 'rate-ip', $ip), $bucket);
            return $global <= 120 && $local <= 8;
        });
        if (!$allowed) {
            throw new LeadError(429, 'rate_limit');
        }
    }

    public function reserve(string $idempotencyKey, string $fingerprint, string $version, ?array $lead = null): array
    {
        $key = digest($this->hashKey, 'ledger-id', strtolower($idempotencyKey));
        $now = $this->now();
        return $this->transaction(function () use ($key, $fingerprint, $version, $now, $lead): array {
            $row = $this->run('SELECT * FROM operations WHERE key = COALESCE(
                (SELECT operation_key FROM operation_aliases WHERE key = ?), ?)', [$key, $key])->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $row = $this->run('SELECT * FROM operations WHERE fingerprint = ?
                    AND (receipt_id IS NULL OR consent_at >= ?) ORDER BY consent_at DESC LIMIT 1',
                    [$fingerprint, $now - 900_000])->fetch(PDO::FETCH_ASSOC);
                if ($row) {
                    $this->run('INSERT INTO operation_aliases VALUES (?, ?)', [$key, $row['key']]);
                } else {
                    $this->run('INSERT INTO operations VALUES (?, ?, ?, ?, 0, NULL)', [$key, $fingerprint, $version, $now]);
                    $row = ['key' => $key, 'fingerprint' => $fingerprint, 'consent_at' => $now, 'lease_until' => 0, 'receipt_id' => null];
                }
            }
            if (!hash_equals($row['fingerprint'], $fingerprint)) {
                throw new LeadError(409, 'idempotency_conflict');
            }
            if ($row['receipt_id'] === null && (int) $row['lease_until'] > $now) {
                throw new LeadError(409, 'request_in_progress');
            }
            $lease = 0;
            if ($row['receipt_id'] === null) {
                $lease = $now + 60_000;
                $this->run('UPDATE operations SET lease_until = ? WHERE key = ?', [$lease, $row['key']]);
            }
            if ($lease > 0 && $lead !== null) {
                $this->run('INSERT OR IGNORE INTO pending_delivery (operation_key, payload, next_at) VALUES (?, ?, ?)',
                    [$row['key'], $this->seal($lead, $row['key']), $now]);
            }
            return ['key' => $row['key'], 'lease' => $lease, 'consentAt' => (int) $row['consent_at'], 'receiptId' => $row['receipt_id']];
        });
    }

    public function finish(array $operation, string $receipt): void
    {
        $this->transaction(function () use ($operation, $receipt): void {
            $rows = $this->run('UPDATE operations SET receipt_id = ?, lease_until = 0 WHERE key = ? AND lease_until = ?',
                [$receipt, $operation['key'], $operation['lease']])->rowCount();
            if ($rows !== 1) {
                throw new LeadError(503, 'temporarily_unavailable');
            }
            $this->run('DELETE FROM pending_delivery WHERE operation_key = ?', [$operation['key']]);
        });
    }

    public function release(array $operation, bool $hold = false): bool
    {
        return $this->transaction(function () use ($operation, $hold): bool {
            $rows = $this->run('UPDATE operations SET lease_until = 0 WHERE key = ? AND lease_until = ?',
                [$operation['key'], $operation['lease']])->rowCount();
            if ($rows !== 1) {
                return false;
            }
            $attempts = (int) $this->run('SELECT attempts FROM pending_delivery WHERE operation_key = ?',
                [$operation['key']])->fetchColumn() + 1;
            $held = $hold || $attempts >= 12;
            $delay = min(3600, 60 * (2 ** min(6, $attempts - 1)));
            $next = $held ? PHP_INT_MAX : $this->now() + $delay * 1000;
            $this->run('UPDATE pending_delivery SET attempts = ?, next_at = ? WHERE operation_key = ?',
                [$attempts, $next, $operation['key']]);
            return $held;
        });
    }

    public function expirePending(): int
    {
        $now = $this->now();
        return $this->run('DELETE FROM pending_delivery WHERE operation_key IN (
            SELECT key FROM operations WHERE consent_at < ? AND lease_until <= ?)',
            [$now - $this->retentionDays * 86_400_000, $now])->rowCount();
    }

    public function claimPending(): ?array
    {
        return $this->transaction(function (): ?array {
            $now = $this->now();
            $row = $this->run('SELECT o.*, p.payload FROM pending_delivery AS p
                JOIN operations AS o ON o.key = p.operation_key
                WHERE p.next_at <= ? AND o.lease_until <= ? AND o.receipt_id IS NULL
                  AND o.consent_at >= ?
                ORDER BY p.next_at LIMIT 1', [$now, $now, $now - $this->retentionDays * 86_400_000])->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return null;
            }
            $lease = $now + 60_000;
            $this->run('UPDATE operations SET lease_until = ? WHERE key = ?', [$lease, $row['key']]);
            return ['key' => $row['key'], 'lease' => $lease, 'consentAt' => (int) $row['consent_at'],
                'version' => $row['consent_version'], 'fingerprint' => $row['fingerprint'], 'payload' => $row['payload']];
        });
    }

    public function openPending(array $operation): array
    {
        $sealed = base64_decode($operation['payload'], true);
        if ($sealed === false || strlen($sealed) < 29) {
            throw new LeadError(503, 'pending_payload_invalid');
        }
        $data = openssl_decrypt(substr($sealed, 28), 'aes-256-gcm', $this->deliveryKey(), OPENSSL_RAW_DATA,
            substr($sealed, 0, 12), substr($sealed, 12, 16), $operation['key']);
        if ($data === false) {
            throw new LeadError(503, 'pending_payload_invalid');
        }
        return json_decode($data, true, 32, JSON_THROW_ON_ERROR);
    }

    private function seal(array $lead, string $key): string
    {
        $nonce = random_bytes(12);
        $encrypted = openssl_encrypt(json_encode($lead, JSON_FLAGS), 'aes-256-gcm', $this->deliveryKey(),
            OPENSSL_RAW_DATA, $nonce, $tag, $key);
        if ($encrypted === false) {
            throw new LeadError(503, 'pending_encryption_failed');
        }
        return base64_encode($nonce . $tag . $encrypted);
    }

    private function deliveryKey(): string
    {
        return hash_hmac('sha256', 'dekoray-pending-delivery-v1', $this->hashKey, true);
    }

    private function hit(string $subject, int $bucket): int
    {
        $this->run('INSERT INTO rate_limits VALUES (?, ?, 1)
            ON CONFLICT(subject, bucket) DO UPDATE SET hits = min(hits + 1, 121)', [$subject, $bucket]);
        return (int) $this->run('SELECT hits FROM rate_limits WHERE subject = ? AND bucket = ?', [$subject, $bucket])->fetchColumn();
    }

    private function run(string $sql, array $params): \PDOStatement
    {
        $statement = $this->db->prepare($sql);
        foreach ($params as $index => $value) {
            $statement->bindValue($index + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $statement->execute();
        return $statement;
    }

    private function transaction(callable $callback): mixed
    {
        $this->db->exec('BEGIN IMMEDIATE');
        try {
            $result = $callback();
            $this->db->exec('COMMIT');
            return $result;
        } catch (Throwable $error) {
            $this->db->exec('ROLLBACK');
            throw $error;
        }
    }

    private function now(): int
    {
        return (int) floor(microtime(true) * 1000);
    }
}
