export const skuKey = value => typeof value === 'string' ? value.trim().normalize('NFC').toUpperCase() : ''

const cyrillic = 'АВЕКМНОРСТУХ'
const latin = 'ABEKMHOPCTYX'

function searchSku(value) {
  return skuKey(value).normalize('NFKC').replace(/[\s\u200B-\u200D\u2060]/gu, '')
    .replace(/[‐‑‒–—−]/gu, '-')
    .replace(/[АВЕКМНОРСТУХ]/gu, letter => latin[cyrillic.indexOf(letter)])
}

const kindNames = [
  ['flexible_stone', /\bflexible stone\b|гибк\p{L}*\s+кам\p{L}*/iu],
  ['panel', /(?:^|\P{L})панел\p{L}*/iu],
  ['slat', /(?:^|\P{L})рейк\p{L}*/iu],
  ['profile', /(?:^|\P{L})профил\p{L}*/iu],
]

function knownKind(value) {
  const matches = kindNames.filter(([, pattern]) => pattern.test(value))
  return matches.length === 1 ? matches[0][0] : undefined
}

const dimensionLabels = [
  ['lengthMm', 'длина'],
  ['widthMm', 'ширина'],
  ['thicknessMm', 'толщина'],
]

const normalizedLabel = value => typeof value === 'string' ? value.trim().toLowerCase() : ''
const numbers = /\d+(?:[.,]\d+)?\s*[*xх×]\s*\d+(?:[.,]\d+)?(?:\s*[*xх×]\s*\d+(?:[.,]\d+)?)?\s*мм(?!\p{L})/giu
const mmNumber = value => Number(String(value).replace(',', '.'))

function entitySpecs(entity) {
  const attributes = [...(entity?.attributes ?? []), ...(entity?.characteristics ?? [])]
  const name = typeof entity?.name === 'string' ? entity.name : ''
  const namedKind = knownKind(name)
  const structuredKinds = attributes.flatMap(attr => {
    const value = attr?.value
    if (normalizedLabel(attr?.name) !== 'тип изделия' || typeof value !== 'string') return []
    const kind = knownKind(value)
    return kind ? [kind] : []
  })
  const kinds = new Set([namedKind, ...structuredKinds].filter(Boolean))
  const kind = kinds.size > 1 ? null : kinds.values().next().value
  const dimensions = {}
  const formats = [...name.matchAll(numbers)]
  if (formats.length === 1) {
    const [a, b, thickness] = formats[0][0].match(/\d+(?:[.,]\d+)?/g).map(mmNumber)
    dimensions.widthMm = Math.min(a, b)
    dimensions.lengthMm = Math.max(a, b)
    if (thickness !== undefined) dimensions.thicknessMm = thickness
  }
  for (const [key, label] of dimensionLabels) {
    const values = attributes.flatMap(({ name, value } = {}) => {
      const field = normalizedLabel(name)
      const mmLabel = [label + ', мм', label + ' (мм)', label + ' мм'].includes(field)
      const match = typeof value === 'string' ? value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(мм)?$/iu) : null
      const number = typeof value === 'number' && mmLabel ? value
        : match && (mmLabel || (field === label && match[2])) ? mmNumber(match[1]) : undefined
      return field === label || mmLabel ? [number].filter(n => Number.isFinite(n) && n > 0) : []
    })
    if (dimensions[key] !== undefined) values.push(dimensions[key])
    if (values.length) dimensions[key] = values.every(value => value === values[0]) ? values[0] : null
  }
  return { kind, dimensions }
}

export function checkedSpecs(product, entity, parent, approved) {
  const parentSpecs = entitySpecs(parent)
  const entityData = entitySpecs(entity)
  const kind = entityData.kind === undefined ? parentSpecs.kind : entityData.kind
  const dimensions = { ...parentSpecs.dimensions, ...entityData.dimensions }
  if (kind === null || (kind && product.kind && kind !== product.kind)) return 'type_mismatch'
  const expected = { ...product.dimensions }
  if (product.kind !== 'flexible_stone' && product.thicknessMm !== undefined) {
    expected.thicknessMm = product.thicknessMm
  }
  const keys = Object.keys(expected)
  if (keys.some(key => dimensions[key] !== undefined && dimensions[key] !== expected[key])) return 'dimensions_mismatch'
  if (!approved && ((product.kind && !kind) || keys.some(key => dimensions[key] === undefined))) {
    return 'spec_unverified'
  }
}

export function candidateDetails(product, records, approved) {
  const sku = skuKey(product.sku)
  const approvedId = approved?.id?.toLowerCase()
  const loose = searchSku(sku)
  return records.flatMap(({ row, source }) => {
    const article = skuKey(row.article)
    const field = approvedId === row.id ? 'approved_uuid'
      : approved?.externalCode && approved.externalCode === row.externalCode ? 'approved_externalCode'
      : !sku ? undefined
      : article === sku ? 'article'
      : skuKey(row.code) === sku ? 'code'
      : skuKey(row.externalCode) === sku ? 'externalCode'
      : row.barcodes?.some(barcode => Object.values(barcode).some(code => skuKey(code) === sku)) ? 'barcode'
      : article && searchSku(article) === loose ? 'similar_article' : undefined
    if (!field) return []
    return [{ id: row.id, type: row.meta.type, article: row.article, field, source, archived: row.archived,
      ...entitySpecs(row) }]
  })
}

export function candidateReason(sku, candidates) {
  if (!sku) return 'missing_catalog_sku'
  if (candidates.some(candidate => candidate.field === 'article' && !candidate.archived)) return 'excluded_from_assortment'
  if (candidates.some(candidate => candidate.field === 'article' && candidate.archived)) return 'archived_only'
  if (candidates.some(candidate => candidate.field !== 'similar_article')) return 'alternate_identifier'
  if (candidates.length) return 'similar_article'
  return 'no_exact_article'
}
