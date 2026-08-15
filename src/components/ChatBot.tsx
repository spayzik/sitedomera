import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { faq, CONTACTS, products, collections } from '../data/products'

interface Msg {
  from: 'bot' | 'user'
  text: string
}

function answer(input: string): string {
  const q = input.toLowerCase()

  if (/привет|здравств|добрый|hello|hi/.test(q)) {
    return `Здравствуйте! Я помощник "${CONTACTS.brand}". Спросите про размеры, цены, монтаж, коллекции или доставку.`
  }
  if (/цен|стоим|сколько|руб|6000/.test(q)) {
    return 'Стеновые панели — 6 000 ₽/шт. Декоративные рейки — 1 500 ₽/шт. Профили комплектуются отдельно.'
  }
  if (/размер|габарит|1220|толщин|вес|мм/.test(q)) {
    return 'Панель: 1220 x 3000 x 5 мм, вес ~ 13 кг. Рейки: 155 x 3000 мм.'
  }
  if (/монтаж|кле|креп|установ/.test(q)) {
    return 'Монтаж на клей без видимого крепежа. Панели легко режутся, стыкуются алюминиевыми профилями.'
  }
  if (/достав|отправ|город|росси/.test(q)) {
    return 'Доставляем по всей России. Напишите город — менеджер рассчитает логистику.'
  }
  if (/шоурум|офис|адрес|приехать|образц/.test(q)) {
    return `Шоурум — по записи. Телефон ${CONTACTS.phone}. Можно оставить заявку в форме на сайте.`
  }
  if (/коллекц|серия|фактур|дерево|ткан|металл|штукатур/.test(q)) {
    return `Коллекции: ${collections.map((c) => c.name).join(', ')}. Всего ${products.length} артикулов в каталоге 2026.`
  }
  if (/бамбук|материал|wpc|состав/.test(q)) {
    return 'Основа — древесно-бамбуковый композит (ABA), плотность 0,7 г/см\u00B3. Сверху декоративная ПВХ/ПП пленка на PUR-клее.'
  }
  if (/телефон|связ|контакт|менедж/.test(q)) {
    return `Телефон: ${CONTACTS.phone}. Напишите нам в Telegram: @domeraru. Также есть магазин на Авито.`
  }
  if (/влаг|ванн|кухн|влажн/.test(q)) {
    return 'Панели устойчивы к влаге и перепадам температур — подходят для жилых и коммерческих зон.'
  }

  const hit = faq.find(
    (f) =>
      f.q.toLowerCase().split(' ').some((w) => w.length > 4 && q.includes(w)) ||
      f.a.toLowerCase().includes(q.slice(0, 12)),
  )
  if (hit) return hit.a

  return `Могу рассказать про цены, размеры, монтаж, коллекции и шоурум. Или позвоните: ${CONTACTS.phone}`
}

export function ChatBot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: 'bot',
      text: 'Здравствуйте! Я помогу с панелями Домэра: размеры, цены, коллекции, монтаж. Задайте вопрос или выберите быстрый.',
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    setMsgs((m) => [...m, { from: 'user', text: t }])
    setInput('')
    window.setTimeout(() => {
      setMsgs((m) => [...m, { from: 'bot', text: answer(t) }])
    }, 400)
  }

  const quick = ['Цена панели?', 'Какой размер?', 'Как монтировать?', 'Шоурум']

  return (
    <div className={`chatbot ${open ? 'open' : ''}`}>
      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <div>
              <strong>Помощник Домэра</strong>
              <span>онлайн</span>
            </div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть чат">
              <X size={16} />
            </button>
          </div>
          <div className="chat-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="chat-quick">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ваш вопрос..."
            />
            <button type="submit" aria-label="Отправить">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Чат"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  )
}
