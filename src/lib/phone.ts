export function formatPhone(value: string): string {
  let d = value.replace(/\D/g, '')
  if (d.startsWith('8')) d = '7' + d.slice(1)
  if (d && !d.startsWith('7')) d = '7' + d
  d = d.slice(0, 11)
  if (!d) return ''
  if (d.length === 1) return `+${d}`
  let out = `+7 (${d.slice(1, 4)}`
  if (d.length >= 5) out += `) ${d.slice(4, 7)}`
  if (d.length >= 8) out += `-${d.slice(7, 9)}`
  if (d.length >= 10) out += `-${d.slice(9, 11)}`
  return out
}

export function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length === 11
}