export const leadIntents = {
  consultation: {
    title: 'Консультация',
    subject: 'Консультация по материалам',
    message: 'Здравствуйте! Хочу проконсультироваться по стеновым панелям ДЕКОРАЙ.',
  },
  selection: {
    title: 'Подбор материалов',
    subject: 'Подбор материалов',
    message: 'Здравствуйте! Помогите подобрать материалы ДЕКОРАЙ для моего проекта.',
  },
  calculation: {
    title: 'Уточнить расчёт',
    subject: 'Расчёт материалов',
    message: 'Здравствуйте! Хочу уточнить расчёт материалов ДЕКОРАЙ для моей стены.',
  },
  samples: {
    title: 'Запросить образцы',
    subject: 'Запрос образцов',
    message: 'Здравствуйте! Хочу уточнить, какие образцы ДЕКОРАЙ можно посмотреть в шоуруме.',
  },
} as const

export type LeadIntent = keyof typeof leadIntents

export function isLeadIntent(value: unknown): value is LeadIntent {
  return typeof value === 'string' && Object.hasOwn(leadIntents, value)
}

export const leadContextLimit = 500
