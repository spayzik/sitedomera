import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { LeadError } from './validation.mjs'

export function digest(key, domain, data) {
  return createHmac('sha256', key).update(domain).update('\0').update(data).digest('hex')
}

export function syncId(key, domain, data) {
  const digits = digest(key, domain, data)
  return [digits.slice(0, 8), digits.slice(8, 12), '4' + digits.slice(13, 16), '8' + digits.slice(17, 20), digits.slice(20, 32)].join('-')
}

export function createLedger(path, hashKey, retentionDays, clock = Date.now) {
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 2000;
    CREATE TABLE IF NOT EXISTS operations (
      key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, consent_version TEXT NOT NULL,
      consent_at INTEGER NOT NULL, lease_until INTEGER NOT NULL, receipt_id TEXT
    );
    CREATE INDEX IF NOT EXISTS operation_age ON operations (consent_at);
    CREATE INDEX IF NOT EXISTS operation_replay ON operations (fingerprint, consent_at);
    CREATE TABLE IF NOT EXISTS operation_aliases (
      key TEXT PRIMARY KEY,
      operation_key TEXT NOT NULL REFERENCES operations(key) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS alias_operation ON operation_aliases (operation_key);
    CREATE TABLE IF NOT EXISTS rate_limits (subject TEXT, bucket INTEGER, hits INTEGER, PRIMARY KEY(subject, bucket));
    CREATE INDEX IF NOT EXISTS rate_age ON rate_limits (bucket);
  `)

  const get = db.prepare('SELECT * FROM operations WHERE key = ?')
  const alias = db.prepare('SELECT operation_key FROM operation_aliases WHERE key = ?')
  const findReplay = db.prepare('SELECT * FROM operations WHERE fingerprint = ? AND consent_at >= ? ORDER BY consent_at DESC LIMIT 1')
  const addAlias = db.prepare('INSERT INTO operation_aliases VALUES (?, ?)')
  const insert = db.prepare('INSERT OR IGNORE INTO operations VALUES (?, ?, ?, ?, 0, NULL)')
  const claimLease = db.prepare('UPDATE operations SET lease_until = ? WHERE key = ? AND lease_until <= ? AND receipt_id IS NULL')
  const finish = db.prepare('UPDATE operations SET receipt_id = ?, lease_until = 0 WHERE key = ? AND lease_until = ?')
  const release = db.prepare('UPDATE operations SET lease_until = 0 WHERE key = ? AND lease_until = ?')
  const recordRate = db.prepare(`
    INSERT INTO rate_limits VALUES (?, ?, 1)
      ON CONFLICT(subject, bucket) DO UPDATE SET hits = min(hits + 1, 601)
    RETURNING hits
  `)
  const pruneLimits = db.prepare('DELETE FROM rate_limits WHERE bucket < ?')
  const pruneOperations = db.prepare('DELETE FROM operations WHERE consent_at < ? AND lease_until < ?')

  return {
    consumeRate(ip) {
      const now = clock()
      const bucket = Math.floor(now / 60_000)
      pruneLimits.run(bucket - 1)
      pruneOperations.run(now - retentionDays * 86_400_000, now)
      if (recordRate.get('global', bucket).hits > 120 ||
          recordRate.get(digest(hashKey, 'rate-ip', ip), bucket).hits > 8) {
        throw new LeadError(429, 'rate_limit')
      }
    },
    reserve(idempotencyKey, fingerprint, version) {
      const key = digest(hashKey, 'ledger-id', idempotencyKey)
      const now = clock()
      db.exec('BEGIN IMMEDIATE')
      try {
        const existingAlias = alias.get(key)
        let row = existingAlias ? get.get(existingAlias.operation_key) : get.get(key)
        if (!row) {
          row = findReplay.get(fingerprint, now - 15 * 60_000)
          if (row) addAlias.run(key, row.key)
          else {
            insert.run(key, fingerprint, version, now)
            row = get.get(key)
          }
        }
        if (row.fingerprint !== fingerprint) throw new LeadError(409, 'idempotency_conflict')
        let lease = 0
        if (!row.receipt_id) {
          lease = now + 60_000
          if (claimLease.run(lease, row.key, now).changes !== 1) {
            db.exec('COMMIT')
            return { inProgress: true }
          }
        }
        db.exec('COMMIT')
        return { key: row.key, lease, consentAt: row.consent_at, receiptId: row.receipt_id }
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    finish(operation, receiptId) {
      if (finish.run(receiptId, operation.key, operation.lease).changes !== 1) throw new LeadError(503, 'temporarily_unavailable')
    },
    release(operation) { release.run(operation.key, operation.lease) },
    close() { db.close() },
  }
}
