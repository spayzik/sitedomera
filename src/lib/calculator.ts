export const PANEL_AREA = 1.22 * 3

export function calculatePanels(length: string, height: string, openings: string) {
  const values = [length, height, openings].map(value => Number(value.replace(',', '.')))
  const valid = values.every(value => Number.isFinite(value) && value >= 0 && value <= 10000)
  const area = valid ? Math.max(values[0] * values[1] - values[2], 0) : 0
  return { valid, area, sheets: Math.ceil(area / PANEL_AREA) }
}
