import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const verifier = fileURLToPath(new URL('./verify-production-build.mjs', import.meta.url))

test('the production gate accepts a real build and blocks unexpected paths and disguised private content', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'dekoray-release-gate-'))
  const dist = join(cwd, 'dist')
  const run = () => spawnSync(process.execPath, [verifier], { cwd, encoding: 'utf8', timeout: 20_000 })
  try {
    await cp('dist', dist, { recursive: true })
    const clean = run()
    assert.equal(clean.status, 0, clean.stderr)
    const main = 'assets/' + (await readdir(join(dist, 'assets'))).find(name => /^index-.+\.js$/.test(name))
    for (const [path, body, reason] of [
      ['assets/Orphan-12345678.js', 'export default 1', /Unapproved public path/],
      ['customer/report.md', 'draft', /Unapproved public path/],
      ['catalog/note.webp', 'not an approved storefront image', /Unapproved public path/],
      ['assets/index-12345678.js.map', '{}', /Unapproved public path/],
      [main, '/* Codex handoff: draft */', /Internal work marker/],
      [main, 'const data = {warehouseId: "test-only"}', /Private integration marker/],
      [main, 'const AVITO_CLIENT_SECRET = "test-only"', /Private\/config marker/],
      ['generated/inventory.json', '{}', /Unapproved public path/],
      ['generated/avito-reviews.json', '{"source":"avito","reviews":[],"raw":"private"}', /only the approved public fields/],
      ['catalog/hero/hero.webp', 'private document renamed', /Invalid public binary type/],
    ]) {
      const target = join(dist, path)
      const original = await readFile(target).catch(error => {
        if (error.code !== 'ENOENT') throw error
        return null
      })
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, path === main ? Buffer.concat([original, Buffer.from('\n' + body)]) : body)
      const result = run()
      assert.equal(result.status, 1, 'Unexpected result for ' + path)
      assert.match(result.stderr, reason)
      if (original) await writeFile(target, original)
      else await rm(target)
    }
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
