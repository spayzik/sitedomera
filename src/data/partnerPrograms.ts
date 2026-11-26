export const partnerPrograms = {
  wholesale: { title: 'Оптовые закупки', action: 'Запросить оптовый прайс' },
  dealer: { title: 'Дилерство', action: 'Обсудить дилерство' },
  designer: { title: 'Дизайнеры и прорабы', action: 'Обсудить условия проекта' },
  agent: { title: 'Агентская программа', action: 'Привести клиента' },
  dropshipping_resale: { title: 'Дропшиппинг · перепродажа', action: 'Обсудить поставку' },
  dropshipping_referral: { title: 'Дропшиппинг · агент', action: 'Обсудить агентскую модель' },
} as const

export type PartnerProgram = keyof typeof partnerPrograms

export function isPartnerProgram(value: unknown): value is PartnerProgram {
  return typeof value === 'string' && Object.hasOwn(partnerPrograms, value)
}

export function programTitle(value: string) {
  return isPartnerProgram(value) ? partnerPrograms[value].title : value
}
