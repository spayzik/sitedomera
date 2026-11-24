import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const providers = [
  { prefix: 'GOOGLE', name: 'google-site-verification', file: /^google[a-zA-Z0-9]+\.html$/ },
  { prefix: 'YANDEX', name: 'yandex-verification', file: /^yandex_([a-zA-Z0-9]+)\.html$/ },
]

export async function searchOwnership(env = process.env) {
  const files = new Map()
  const tags = []
  if (env.VITE_DEKORAY_PREVIEW === '1') return { files, tags }
  for (const { prefix, name, file } of providers) {
    const value = env['DEKORAY_' + prefix + '_VERIFICATION_META']
    if (value) {
      if (!/^[A-Za-z0-9_-]{5,160}$/.test(value)) throw new Error('Invalid ' + prefix + ' verification code')
      tags.push('<meta name="' + name + '" content="' + value + '">')
    }
    const location = env['DEKORAY_' + prefix + '_VERIFICATION_FILE']
    if (!location) continue
    const filename = basename(location)
    const match = filename.match(file)
    if (!match) throw new Error('Invalid ' + prefix + ' verification filename')
    const bytes = await readFile(location)
    const body = bytes.toString('utf8').trim()
    const valid = prefix === 'GOOGLE'
      ? body === 'google-site-verification: ' + filename
      : body.includes('Verification: ' + match[1] + '</body>') ||
        new RegExp('<body>\\s*Verification: ' + match[1] + '\\s*</body>', 'i').test(body)
    if (bytes.length > 4096 || !valid || /<script|<iframe|<object|javascript:|\son\w+\s*=/i.test(body)) {
      throw new Error('Unexpected ' + prefix + ' verification file')
    }
    files.set(filename, bytes)
  }
  return { files, tags }
}
