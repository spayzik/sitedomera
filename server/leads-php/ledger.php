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
        $this->db->exec('PRAGMA busy_timeout = 2000; PRAGMA foreign_keys = ON;');
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
            SQL);
    }

    public function consumeRate(string $ip): void
    {
        $now = $this->now();
        $bucket = intdiv($now, 60_000);
        $allowed = $this->transaction(function () use ($bucket, $now, $ip): bool {
            $this->run('DELETE FROM rate_limits WHERE bucket < ?', [$bucket - 1]);
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

    public function reserve(string $idempotencyKey, string $fingerprint, string $version): array
    {
        $key = digest($this->hashKey, 'ledger-id', strtolower($idempotencyKey));
        $now = $this->now();
        return $this->transaction(function () use ($key, $fingerprint, $version, $now): array {
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
            return ['key' => $row['key'], 'lease' => $lease, 'consentAt' => (int) $row['consent_at'], 'receiptId' => $row['receipt_id']];
        });
    }

    public function finish(array $operation, string $receipt): void
    {
        $rows = $this->run('UPDATE operations SET receipt_id = ?, lease_until = 0 WHERE key = ? AND lease_until = ?',
            [$receipt, $operation['key'], $operation['lease']])->rowCount();
        if ($rows !== 1) {
            throw new LeadError(503, 'temporarily_unavailable');
        }
    }

    public function release(array $operation): void
    {
        $this->run('UPDATE operations SET lease_until = 0 WHERE key = ? AND lease_until = ?',
            [$operation['key'], $operation['lease']]);
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
