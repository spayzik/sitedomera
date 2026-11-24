import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const bin = process.env.DEKORAY_PHP_BIN ?? 'php'
const extensions = process.env.DEKORAY_PHP_EXT
  ? ['-n', '-d', 'extension_dir=' + process.env.DEKORAY_PHP_EXT,
      ...['curl', 'intl', 'mbstring', 'pdo_sqlite', 'openssl'].flatMap(ext => ['-d', 'extension=' + ext])]
  : []
const fixture = fileURLToPath(new URL('./test/payment-contract.php', import.meta.url))

for (const scenario of ['approved_quote', 'price_and_delivery', 'lost_response', 'expired_attempt', 'verified_refund', 'canceled', 'webhook_recovery', 'crm_read_only', 'configuration']) {
  test('PHP checkout contract: ' + scenario, async t => {
    const directory = await mkdtemp(join(tmpdir(), 'dekoray-payment-contract-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const stdout = execFileSync(bin, [...extensions, fixture, scenario, directory],
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    assert.deepEqual(JSON.parse(stdout), { result: 'pass', scenario })
  })
}
