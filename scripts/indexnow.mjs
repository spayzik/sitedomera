import { canonicalUrl, seoPages } from '../src/data/seoRoutes.ts'
import { CONTACTS } from '../src/data/products.ts'

export function indexNowKey(env = process.env) {
  const key = env.DEKORAY_INDEXNOW_KEY
  if (env.VITE_DEKORAY_PREVIEW === '1' || key === undefined || key === '') return undefined
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('Invalid DEKORAY_INDEXNOW_KEY')
  return key
}

export function indexNowPayload(key, paths) {
  const allowed = new Set(seoPages.map(page => page.path))
  if (!paths.length || paths.some(path => !allowed.has(path))) {
    throw new Error('Pass changed canonical storefront paths, without queries or fragments')
  }
  return { host: CONTACTS.hostname, key, urlList: [...new Set(paths)].map(canonicalUrl) }
}

if (import.meta.main) {
  // Run separately after release, only for explicitly supplied changed production URLs.
  const key = indexNowKey()
  if (!key) throw new Error('Set DEKORAY_INDEXNOW_KEY for the production build')
  const payload = indexNowPayload(key, process.argv.slice(2))
  const keyFile = await fetch(canonicalUrl('/' + key + '.txt'), {
    signal: AbortSignal.timeout(10000), redirect: 'error',
  })
  if (!keyFile.ok || (await keyFile.text()).trim() !== key) {
    throw new Error('Production IndexNow ownership file is unavailable or differs')
  }
  const response = await fetch('https://yandex.com/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
  })
  if (![200, 202].includes(response.status)) throw new Error('IndexNow returned HTTP ' + response.status)
  console.log('IndexNow HTTP ' + response.status + '; URLs submitted: ' + payload.urlList.length)
}
