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
  order: {
    title: 'Запросить заказ',
    subject: 'Заявка на заказ',
    message: 'Здравствуйте! Хочу заказать материалы ДЕКОРАЙ и уточнить наличие.',
  },
  installation: {
    title: 'Уточнить монтаж и замер',
    subject: 'Монтаж и замер',
    message: 'Здравствуйте! Хочу обсудить замер и монтаж панелей ДЕКОРАЙ.',
  },
  delivery: {
    title: 'Уточнить доставку',
    subject: 'Доставка материалов',
    message: 'Здравствуйте! Хочу уточнить доставку материалов ДЕКОРАЙ.',
  },
  wholesale: {
    title: 'Узнать оптовые условия',
    subject: 'Оптовые условия',
    message: 'Здравствуйте! Хочу обсудить оптовую поставку материалов ДЕКОРАЙ.',
  },
  designer: {
    title: 'Узнать условия для дизайнеров',
    subject: 'Условия для дизайнеров',
    message: 'Здравствуйте! Хочу обсудить условия работы с дизайнерами.',
  },
  feedback: {
    title: 'Связаться с менеджером',
    subject: 'Обратная связь',
    message: 'Здравствуйте! Хочу связаться с менеджером ДЕКОРАЙ.',
  },
} as const

export type LeadIntent = keyof typeof leadIntents

export function isLeadIntent(value: unknown): value is LeadIntent {
  return typeof value === 'string' && Object.hasOwn(leadIntents, value)
}

export const leadContextLimit = 500

export type LeadItem = { id: string; qty: number }

export type LeadCalculation = {
  id: string
  walls: readonly { length: number; height: number }[]
  openings: number
  reserve: number
  method: 'area' | 'vertical'
}

export type LeadDetails = {
  items?: readonly LeadItem[]
  calculation?: readonly LeadCalculation[]
}
