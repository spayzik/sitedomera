// Конвертирует все JPG в public/ в WebP (quality 80) и удаляет оригиналы.
// Оригиналы остаются в git-истории.
// Запуск: node scripts/convert-webp.mjs
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import sharp from 'sharp'

const ROOT = join(process.cwd(), 'public')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) files.push(...(await walk(p)))
    else if (/\.jpe?g$/i.test(e.name)) files.push(p)
  }
  return files
}

const files = await walk(ROOT)
let before = 0
let after = 0

for (const f of files) {
  const out = f.replace(/\.jpe?g$/i, '.webp')
  const input = await readFile(f)
  const { data, info } = await sharp(input).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })
  await writeFile(out, data)
  await unlink(f)
  before += input.length
  after += info.size
  console.log(`${relative(process.cwd(), out)}  ${(input.length / 1024).toFixed(0)} KB -> ${(info.size / 1024).toFixed(0)} KB`)
}

console.log(`\nФайлов: ${files.length}. ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`)
