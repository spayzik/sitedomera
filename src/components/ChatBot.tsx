import { useEffect, useRef, useState } from 'react'
import { InquiryForm } from './LeadProvider'
import { MessageCircle, X, Send } from 'lucide-react'
import { faq, CONTACTS, products, collections, priceSummary } from '../data/products'

interface Msg {
  from: 'bot' | 'user'
  text: string
}

function answer(input: string): string {
  const q = input.toLowerCase()

  if (/привет|здравств|добрый|hello|hi/.test(q)) {
    return `Здравствуйте! Я помощник "${CONTACTS.brand}". Спросите про размеры, цены, монтаж, коллекции или доставку.`
  }
  if (/цен|стоим|сколько|руб/.test(q)) {
    return priceSummary + '. Наличие уточните у менеджера.'
  }
  if (/размер|габарит|1220|толщин|вес|мм/.test(q)) {
    return faq[0].a
  }
  if (/монтаж|кле|креп|установ/.test(q)) {
    return faq[3].a
  }
  if (/достав|отправ|город|росси/.test(q)) {
    return `Способ доставки, сроки и стоимость уточните у менеджера. Для расчёта логистики напишите город менеджеру в Telegram: ${CONTACTS.telegram} или позвоните ${CONTACTS.phone}.`
  }
  if (/шоурум|офис|адрес|приехать|образц/.test(q)) {
    return `Шоурум по адресу ${CONTACTS.address} открыт ${CONTACTS.hours.toLowerCase()}. Уточнить детали можно по телефону ${CONTACTS.phone} или в Telegram: ${CONTACTS.telegram}.`
  }
  if (/коллекц|серия|фактур|дерево|ткан|металл|штукатур/.test(q)) {
    return `Коллекции: ${collections.map((c) => c.name).join(', ')}. Всего ${products.length} позиций в каталоге 2026.`
  }
  if (/бамбук|материал|wpc|состав/.test(q)) {
    return 'В каталоге есть бамбуковые панели, гибкий камень, рейки и алюминиевые профили. Состав и условия применения уточняются по конкретному изделию.'
  }
  if (/телефон|связ|контакт|менедж/.test(q)) {
    return `Телефон: ${CONTACTS.phone}. Telegram: ${CONTACTS.telegram}.`
  }
  if (/влаг|ванн|кухн|влажн/.test(q)) {
    return faq[4].a
  }

  const hit = faq.find(
    (f) =>
      f.q.toLowerCase().split(' ').some((w) => w.length > 4 && q.includes(w)) ||
      f.a.toLowerCase().includes(q.slice(0, 12)),
  )
  if (hit) return hit.a

  return `Могу рассказать про цены, размеры, монтаж, коллекции и шоурум. Связаться с менеджером: ${CONTACTS.telegram} или ${CONTACTS.phone}.`
}

export function ChatBot() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'form' | 'chat'>('form')
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: 'bot',
      text: 'Здравствуйте! Я помогу с панелями ДЕКОРАЙ: размеры, цены, коллекции, монтаж. Задайте вопрос или выберите быстрый.',
    },
  ])
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (view === 'chat') endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [msgs, open, view])

  useEffect(() => { if (open) heading.current?.focus({ preventScroll: true }) }, [open])

  function close() {
    setOpen(false)
    setView('form')
    trigger.current?.focus({ preventScroll: true })
  }

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
        <div className="chat-panel ym-hide-content" id="domera-chat-panel" role="region" aria-label="Помощник ДЕКОРАЙ"
          onKeyDown={event => { if (event.key === 'Escape') close() }}>
          <div className="chat-head">
            <div ref={heading} tabIndex={-1}>
              <strong>Помощник ДЕКОРАЙ</strong>
            </div>
            <button type="button" className="icon-btn" onClick={close} aria-label="Закрыть помощника">
              <X size={16} />
            </button>
          </div>
          <div className="chat-switch" role="group" aria-label="Раздел помощника">
            <button type="button" aria-pressed={view === 'form'} onClick={() => setView('form')}>Менеджер</button>
            <button type="button" aria-pressed={view === 'chat'} onClick={() => setView('chat')}>Быстрые ответы</button>
          </div>
          <div className="chat-request" hidden={view !== 'form'}>
            <InquiryForm fields={{ intent: 'feedback', context: 'Обратная связь из помощника сайта' }} />
          </div>
          {view === 'chat' && <>
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
                className="ym-disable-keys"
                aria-label="Вопрос для локального автоответа"
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Вопрос для автоответа..."
              />
              <button type="submit" aria-label="Получить автоответ">
                <Send size={16} />
              </button>
            </form>
          </>}
        </div>
      )}
      <button
        type="button"
        className="chat-fab"
        ref={trigger}
        onClick={() => open ? close() : setOpen(true)}
        aria-label={open ? "Закрыть окно помощника" : "Открыть помощника и форму связи"}
        aria-expanded={open}
        aria-controls={open ? "domera-chat-panel" : undefined}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  )
}
