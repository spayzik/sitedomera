import { products, type CollectionId } from '../data/products.ts'

// Aesthetic preference narrows categories. Room/budget do not establish technical suitability.
export const quizCategories: Readonly<Record<string, readonly CollectionId[]>> = {
  cozy: ['wood', 'fabric', 'soft'],
  minimal: ['soft', 'bamboo_stone', 'plaster'],
  metal: ['metal'],
  stone: ['flexible_stone', 'bamboo_stone'],
}

export const quizQuestions = [
  { key: 'room', q: 'Какое помещение будем оформлять?', options: [
    { id: 'living', label: 'Гостиная', sub: 'ТВ-зона и акцентная стена' },
    { id: 'bedroom', label: 'Спальня', sub: 'Изголовье, уют' },
    { id: 'hallway', label: 'Прихожая', sub: 'Проходимая зона' },
    { id: 'office', label: 'Офис и коммерция', sub: 'Ресепшн, кафе, салоны' },
  ] },
  { key: 'style', q: 'Какое настроение ближе?', options: [
    { id: 'cozy', label: 'Тёплый уют', sub: 'Дерево, ткань, софт-тач' },
    { id: 'minimal', label: 'Минимализм', sub: 'Спокойные поверхности' },
    { id: 'metal', label: 'Металл и лофт', sub: 'Металлические фактуры' },
    { id: 'stone', label: 'Фактура камня', sub: 'Гибкий камень и бамбук под камень' },
  ] },
  { key: 'budget', q: 'Какой бюджет всего проекта?', options: [
    { id: 'basic', label: 'До 60 000 ₽', sub: 'Ориентир для обсуждения с менеджером' },
    { id: 'mid', label: '60–120 000 ₽', sub: 'Ориентир для обсуждения с менеджером' },
    { id: 'premium', label: 'От 120 000 ₽', sub: 'Ориентир для обсуждения с менеджером' },
  ] },
] as const

interface QuizState {
  step: number
  answers: Partial<Record<'room' | 'style' | 'budget', string>>
  categoryIds: readonly CollectionId[]
  categoryId: CollectionId | null
  productId: string
}
export const createQuizState = (): QuizState => ({ step: 0, answers: {}, categoryIds: [], categoryId: null, productId: '' })
type QuizAction = { type: 'restart' } | { type: 'answer' | 'category' | 'product'; id: string }
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (action.type === 'restart') return createQuizState()
  if (action.type === 'answer') {
    const question = quizQuestions[state.step]
    if (!question || !question.options.some(o => o.id === action.id)) return state
    const answers = { ...state.answers, [question.key]: action.id }
    const step = state.step + 1
    const categoryIds = step === quizQuestions.length ? quizCategories[answers.style!] : []
    return { ...state, step, answers, categoryIds, categoryId: categoryIds[0] ?? null }
  }
  if (state.step !== quizQuestions.length) return state
  if (action.type === 'category' && state.categoryIds.some(id => id === action.id)) {
    return { ...state, categoryId: action.id as CollectionId, productId: '' }
  }
  if (action.type === 'product' && (action.id === '' || products.some(p => p.id === action.id && p.categoryId === state.categoryId))) {
    return { ...state, productId: action.id }
  }
  return state
}

const roomNotes: Record<string, string> = {
  living: 'Гостиная: обсудите с менеджером размеры ТВ-зоны и расположение стыков.',
  bedroom: 'Спальня: обсудите размеры изголовья и примыкания к мебели.',
  hallway: 'Прихожая: уточните примыкания к дверям и требования к уходу.',
  office: 'Офис и коммерция: уточните требования объекта и документы по выбранному материалу.',
}
export function quizResultContext(state: QuizState): string {
  if (state.step !== quizQuestions.length) return ''
  const budget = quizQuestions[2].options.find(o => o.id === state.answers.budget)!.label
  return `${roomNotes[state.answers.room!]} Бюджет всего проекта: ${budget}. Для проверки бюджета нужны площадь, комплектующие, монтаж и доставка; он не ограничивает цену одного листа и не является готовым расчётом.`
}
