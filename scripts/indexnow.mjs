import { isPrivatePartnerPath } from '../src/data/partnerRoutes.ts'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { canonicalUrl, seoPageFile, indexableSeoPages } from '../src/data/seoRoutes.ts'
import { CONTACTS } from '../src/data/products.ts'

export const indexNowReleaseFile = 'indexnow-release.json'
const productionKey = '1760a4e26f8ffd5a7c8582834e040add582c0d4685b8439b'
const canonicalPath = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/

export function indexNowKey(env = process.env) {
  if (env.VITE_DEKORAY_PREVIEW === '1') return undefined
  const key = env.DEKORAY_INDEXNOW_KEY || (env.VITE_DEKORAY_PREVIEW === '0' ? productionKey : '')
  if (!key) return undefined
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('Invalid DEKORAY_INDEXNOW_KEY')
  return key
}

export async function writeIndexNowRelease(directory) {
  const routes = {}
  for (const { path } of indexableSeoPages) {
    const bytes = await readFile(join(directory, seoPageFile(path)))
    routes[path] = createHash('sha256').update(bytes).digest('hex')
  }
  await writeFile(join(directory, indexNowReleaseFile), JSON.stringify({ host: CONTACTS.hostname, routes }) + '\n')
}

export function readIndexNowRelease(raw) {
  const { host, routes } = JSON.parse(raw)
  if (host !== CONTACTS.hostname || !routes || Array.isArray(routes) ||
      typeof routes !== 'object' || !routes['/'] ||
      Object.entries(routes).some(([path, hash]) => !canonicalPath.test(path) || !/^[a-f0-9]{64}$/.test(hash))) {
    throw new Error('Invalid production IndexNow release list')
  }
  return routes
}

export function changedIndexNowPaths(previous, current) {
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .filter(path => previous[path] !== current[path])
}

export function indexNowPayload(key, paths, removed = []) {
  const allowed = new Set([...indexableSeoPages.map(page => page.path), ...removed])
  if (!paths.length || paths.some(path => !canonicalPath.test(path) || isPrivatePartnerPath(path) || !allowed.has(path))) {
    throw new Error('Pass changed canonical storefront paths, without queries or fragments')
  }
  return { host: CONTACTS.hostname, key, urlList: [...new Set(paths)].map(canonicalUrl) }
}

if (import.meta.main) {
  if (process.env.VITE_DEKORAY_PREVIEW === '1') throw new Error('IndexNow is disabled for staging')
  const key = indexNowKey({ ...process.env, VITE_DEKORAY_PREVIEW: '0' })
  const [mode, previousFile, currentFile] = process.argv.slice(2)
  let paths = process.argv.slice(2)
  let removed = []
  const request = { signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store' }
  if (mode === '--release') {
    if (!previousFile || !currentFile || process.argv.length !== 5) throw new Error('Use --release previous.json|--first current.json')
    const previous = previousFile === '--first' ? {} : readIndexNowRelease(await readFile(previousFile, 'utf8'))
    const currentText = await readFile(currentFile, 'utf8')
    const current = readIndexNowRelease(currentText)
    const live = await fetch(canonicalUrl('/' + indexNowReleaseFile), request)
    if (!live.ok || (await live.text()).trim() !== currentText.trim()) {
      throw new Error('The intended release has not reached the production webroot')
    }
    paths = changedIndexNowPaths(previous, current)
    removed = paths.filter(path => !Object.hasOwn(current, path))
    if (!paths.length) {
      console.log('IndexNow: no canonical changes')
      process.exit(0)
    }
  }
  const payload = indexNowPayload(key, paths, removed)
  const keyFile = await fetch(canonicalUrl('/' + key + '.txt'), request)
  if (!keyFile.ok || (await keyFile.text()).trim() !== key) {
    throw new Error('Production IndexNow ownership file is unavailable or differs')
  }
  for (let at = 0; at < payload.urlList.length; at += 10000) {
    const response = await fetch('https://yandex.com/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ...payload, urlList: payload.urlList.slice(at, at + 10000) }),
      ...request,
    })
    if (![200, 202].includes(response.status)) throw new Error('IndexNow returned HTTP ' + response.status)
    console.log('IndexNow HTTP ' + response.status + '; URLs submitted: ' + Math.min(10000, payload.urlList.length - at))
  }
}
