import { ArrowRight, Box, Building2, Handshake, Layers3, PackageCheck } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { PUBLIC_PARTNER_FAQ } from '../data/partnerFaq'
import { CONTACTS } from '../data/products'
import { storefrontImageSize } from '../data/storefrontImageSizes'
import { isPartnerProgram, partnerPrograms, type PartnerProgram } from '../data/partnerPrograms'
import { useCart } from '../context/CartContext'
import { MessageDraftForm } from '../components/MessageDraftForm'
import { readMarketingAttribution, trackAnalyticsGoal } from '../lib/analytics'
import { loadPartnerSession, partnerError, partnerPreview, readPartnerCode, sendPartnerCommand, type PartnerSession } from '../lib/partnersClient'
import './partner-pages.css'

const PartnerPortal = lazy(() => import('./PartnerPortal').then(module => ({ default: module.PartnerPortal })))

const programs = [
  { key: 'wholesale', path: 'opt/', icon: Box, title: 'Опт для проектов', summary: 'Передайте список материалов и объём. Менеджер подготовит предложение с учётом комплектующих.' },
  { key: 'dealer', path: 'partners/dealers/', icon: Building2, title: 'Дилерство', summary: 'Подберите ассортимент для магазина и согласуйте закупочные цены, прайс и порядок поставок.' },
  { key: 'designer', path: 'dizayneram/', icon: Layers3, title: 'Дизайнеры и прорабы', summary: 'Соберите спецификацию, запросите образцы и зарегистрируйте проект с согласованными условиями.' },
  { key: 'agent', path: 'partners/agents/', icon: Handshake, title: 'Агентская программа', summary: 'Передайте покупателя по своему коду и отслеживайте подтверждённые сделки и начисления.' },
  { key: 'dropshipping_resale', path: 'partners/dropshipping/', icon: PackageCheck, title: 'Работа без склада', summary: 'Согласуйте поставку для перепродажи или выберите агентскую модель, если заказ оформляет ДЕКОРАЙ.' },
] as const

const pages = {
  '/partners/': {
    title: 'Материалы для проектов. Условия для партнёров',
    lead: 'Стеновые панели, фактуры и комплектующие для тех, кто проектирует, строит и продаёт. Соберите подборку и обсудите условия закупки или агентского сотрудничества.',
    program: 'wholesale',
    action: 'Стать партнёром',
    details: ['Опишите проект или формат работы', 'Согласуйте условия с менеджером', 'Получите предложение или доступ в кабинет'],
  },
  '/partners/dealers/': {
    title: 'Дилерская программа ДЕКОРАЙ',
    lead: 'Для магазинов и региональных поставщиков отделочных материалов. Обсудите ассортимент, закупочный прайс и порядок поставок для вашей точки продаж.',
    program: 'dealer',
    action: 'Обсудить дилерство',
    details: ['Укажите регион и формат продаж', 'Согласуйте ассортимент и закупочные условия', 'Получите доступ к своим документам и заказам'],
  },
  '/partners/agents/': {
    title: 'Агентская программа ДЕКОРАЙ',
    lead: 'Рекомендуйте материалы клиентам. Передайте код или ссылку, чтобы менеджер мог сверить обращение и связать подтверждённую сделку с партнёром.',
    program: 'agent',
    action: 'Привести клиента',
    details: ['Подайте заявку и согласуйте условия', 'Передайте персональный код покупателю', 'Следите за подтверждёнными сделками и начислениями'],
  },
  '/partners/dropshipping/': {
    title: 'Дропшиппинг с ДЕКОРАЙ',
    lead: 'Для продавцов, которым нужна поставка без собственного склада. Выберите, кто оформляет продажу покупателю, и согласуйте доставку и возвраты с менеджером.',
    program: 'dropshipping_resale',
    action: 'Обсудить поставку',
    details: ['Выберите перепродажу или агентскую модель', 'Согласуйте цену, доступность и доставку', 'Передайте подтверждённый запрос на поставку'],
  },
} as const
type PublicPath = keyof typeof pages

const headings: Record<PartnerProgram, string> = {
  wholesale: 'Оптовое предложение',
  dealer: 'Заявка на дилерство',
  designer: 'Условия для проекта',
  agent: 'Заявка в агентскую программу',
  dropshipping_resale: 'Запрос поставки без склада',
  dropshipping_referral: 'Заявка на агентскую модель',
}
const goals = {
  wholesale: 'wholesale_request',
  dealer: 'dealer_request',
  designer: 'designer_request',
  agent: 'partner_application',
  dropshipping_resale: 'dropshipping_request',
  dropshipping_referral: 'dropshipping_request',
} as const

type SessionState = PartnerSession | 'loading' | 'unavailable'

function PublicRequest({ base, initial }: { base: string; initial: PartnerProgram }) {
  const { items, setOpen } = useCart()
  const [session, setSession] = useState<SessionState>(partnerPreview ? 'unavailable' : 'loading')
  const [program, setProgram] = useState(initial)
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'application' | 'referral'>('application')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const query = new URL(window.location.href).searchParams.get('program')
    if (isPartnerProgram(query)) setProgram(query)
    const partner = readPartnerCode()
    if (partner) { setCode(partner); setMode('referral') }
    if (partnerPreview) return
    const controller = new AbortController()
    loadPartnerSession(controller.signal).then(setSession, () => {
      if (!controller.signal.aborted) setSession('unavailable')
    })
    return () => controller.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || typeof session !== 'object') return
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError('')
    setReceipt('')
    try {
      const attribution = await readMarketingAttribution()
      const email = String(data.get('email') ?? '')
      const details = String(data.get('details') ?? '')
      const consent = data.has('consent')
      const { value, status } = await sendPartnerCommand(session.csrf, mode === 'referral'
        ? { action: 'referral_create', code: code.trim(), clientEmail: email, details, consent, attribution }
        : {
          action: 'apply', program, name: String(data.get('name') ?? ''), email, details, consent, attribution, code: readPartnerCode(),
          items: data.has('includeCart') ? items.map(({ product, qty }) => ({ id: product.id, quantity: qty })) : undefined,
          area: data.get('area') ? Number(data.get('area')) : undefined,
        })
      if (!value.id) throw new Error('Missing receipt')
      if (mode === 'application' && status === 201 && value.duplicate !== true) trackAnalyticsGoal(goals[program])
      setReceipt(value.duplicate
        ? 'Обращение уже зарегистрировано. Менеджер продолжит работу с ним.'
        : mode === 'referral' ? 'Обращение зарегистрировано. Менеджер проверит код и свяжется с вами.'
          : 'Заявка принята. Менеджер свяжется с вами по указанной почте.')
      form.reset()
    } catch (reason) { setError(partnerError(reason)) }
    finally { setBusy(false) }
  }

  return <section className="partner-application" id="partner-application" aria-labelledby="partner-application-title">
    <div>
      <p className="hero-eyebrow">Индивидуальные условия по запросу</p>
      <h2 id="partner-application-title">Обсудим ваш проект</h2>
      <p>Для предложения достаточно артикулов или площади, города и удобного срока поставки.</p>
      <div className="partner-actions">
        <a href={'tel:' + CONTACTS.phoneRaw}>{CONTACTS.phone}</a>
        <a href={CONTACTS.telegram} rel="noreferrer" target="_blank">Telegram менеджера <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
    </div>
    {session === 'loading' && <p role="status">Проверяем доступность формы…</p>}
    {session === 'unavailable' && <div className="partner-contact-card">
      <h3>{partnerPreview ? 'Запрос через менеджера' : 'Свяжитесь с менеджером'}</h3>
      <p>Отправьте менеджеру список материалов и короткое описание проекта.</p>
      <MessageDraftForm key={program} fields={{ intent: program === 'wholesale' || program === 'designer' ? program : 'feedback',
        context: partnerPrograms[program].title }} />
    </div>}
    {typeof session === 'object' && <form className="partner-form ym-hide-content" onSubmit={submit}>
      <div className="partner-mode" aria-label="Тип обращения">
        <button type="button" aria-pressed={mode === 'application'} onClick={() => { setMode('application'); setReceipt(''); setError('') }}>Стать партнёром</button>
        <button type="button" aria-pressed={mode === 'referral'} onClick={() => { setMode('referral'); setReceipt(''); setError('') }}>Есть код партнёра</button>
      </div>
      {mode === 'application' ? <>
        <label>Направление<select value={program} onChange={event => { if (isPartnerProgram(event.target.value)) setProgram(event.target.value) }}>
          {Object.entries(partnerPrograms).map(([key, item]) => <option key={key} value={key}>{item.title}</option>)}
        </select></label>
        <label>Имя или компания<input name="name" type="text" autoComplete="name" className="ym-disable-keys" required minLength={2} maxLength={120} /></label>
        <label>Площадь, м² <small>если известна</small><input name="area" type="number" min="0.01" step="any" max="100000" /></label>
        {items.length > 0 && <div className="partner-inline">
          <label className="partner-checkbox"><input type="checkbox" name="includeCart" defaultChecked /> Приложить корзину ({items.length} поз.)</label>
          <button type="button" className="partner-text-button" onClick={() => setOpen(true)}>Посмотреть</button>
        </div>}
      </> : <label>Код партнёра<input type="text" value={code} onChange={event => setCode(event.target.value)} required minLength={4} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{3,31}" autoComplete="off" /></label>}
      <label>Электронная почта<input className="ym-disable-keys" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Артикулы, город и детали проекта <small>необязательно</small><textarea className="ym-disable-keys" name="details" rows={4} maxLength={1400} /></label>
      <label className="partner-checkbox"><input required name="consent" type="checkbox" /><span>Согласен на обработку данных по <a href={base + session.consentPath.slice(1)}>условиям обработки данных</a>.</span></label>
      <button className="btn btn-white interactive" type="submit" disabled={busy}>{busy ? 'Отправляем…' : mode === 'referral' ? 'Зарегистрировать обращение' : headings[program]}</button>
      {error && <p role="alert" className="partner-error">{error}</p>}
      {receipt && <p role="status" className="partner-receipt">{receipt}</p>}
    </form>}
  </section>
}

export function PartnerLink({ base, wholesale = false }: { base: string; wholesale?: boolean }) {
  const program = wholesale ? 'wholesale' : 'designer'
  return <section className="partner-link-panel" aria-label="Партнёрские условия">
    <div><h2>{wholesale ? 'Оптовые и дилерские условия' : 'Работайте с ДЕКОРАЙ как партнёр'}</h2>
    <p>{wholesale ? 'Индивидуальные предложения для больших закупок и поставок.' : 'Подборки для проекта, образцы по запросу и согласованные агентские условия.'}</p></div>
    <a className="btn btn-outline interactive" href={base + 'partners/?program=' + program + '#partner-application'}>
      {wholesale ? 'Запросить оптовый прайс' : 'Партнёрская программа'} <ArrowRight size={16} aria-hidden="true" />
    </a>
  </section>
}

function PortalEntry({ base, manager }: { base: string; manager: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { if (!partnerPreview) setReady(true) }, [])
  const title = manager ? 'Рабочее место менеджера' : 'Кабинет партнёра'
  const fallback = <div className="partner-page partner-portal container page-section">
    <nav className="page-crumbs" aria-label="Хлебные крошки"><a href={base}>ДЕКОРАЙ</a><a href={base + 'partners/'}>Партнёрам</a><span aria-current="page">{title}</span></nav>
    <header className="page-intro"><h1>{title}</h1></header>
    <div className="partner-contact-card partner-gate">
      <p>{partnerPreview ? 'Партнёрский доступ открывается после согласования условий и подключения защищённого сервиса.' : 'Для входа нужна учётная запись, выданная менеджером.'}</p>
      <a className="btn btn-outline interactive" href={base + 'partners/'}>О партнёрской программе <ArrowRight size={16} aria-hidden="true" /></a>
    </div>
  </div>
  return ready ? <Suspense fallback={fallback}><PartnerPortal base={base} manager={manager} /></Suspense> : fallback
}

export function PartnerPage({ base, path }: { base: string; path: string }) {
  if (path === '/partners/account/' || path === '/partners/manage/' || path === '/partners/manager/') {
    return <PortalEntry base={base} manager={path !== '/partners/account/'} />
  }
  const current = pages[path as PublicPath] ?? pages['/partners/']
  const isDropshipping = path === '/partners/dropshipping/'
  const image = 'catalog/hero/hero-catalog.webp'

  return <div className="partner-page container page-section">
    <nav className="page-crumbs" aria-label="Хлебные крошки">
      <a href={base}>ДЕКОРАЙ</a>
      {path === '/partners/' ? <span aria-current="page">Партнёрам</span> : <><a href={base + 'partners/'}>Партнёрам</a><span aria-current="page">{current.title}</span></>}
    </nav>
    <header className="partner-hero">
      <div className="page-intro">
        <p className="hero-eyebrow">ДЕКОРАЙ · Партнёрам</p>
        <h1>{current.title}</h1>
        <p className="lead">{current.lead}</p>
        <div className="partner-actions">
          <a className="btn btn-white interactive" href="#partner-application">{current.action} <ArrowRight size={16} aria-hidden="true" /></a>
          <a className="btn btn-outline interactive" href={base + 'partners/account/'}>Кабинет партнёра</a>
        </div>
      </div>
      <div className="partner-hero-image">
        <img src={base + image} {...storefrontImageSize(image)} alt="" decoding="async" fetchPriority="high" />
      </div>
    </header>
    {isDropshipping && <section className="partner-model" aria-labelledby="partner-model-title">
      <h2 id="partner-model-title">Две модели поставки</h2>
      <div className="partner-grid">
        <article><h3>Перепродажа</h3><p>Партнёр продаёт материал покупателю. ДЕКОРАЙ выполняет поставку по согласованным условиям. Ответственность за оплату, чек, гарантию и возврат фиксируется до заказа.</p>
          <a href={base + 'partners/dropshipping/?program=dropshipping_resale#partner-application'}>Обсудить поставку <ArrowRight size={16} aria-hidden="true" /></a></article>
        <article><h3>Агентская модель</h3><p>Покупатель заключает сделку с ДЕКОРАЙ. Партнёр передаёт обращение и получает согласованное вознаграждение, если подтверждённая продажа соответствует договору.</p>
          <a href={base + 'partners/dropshipping/?program=dropshipping_referral#partner-application'}>Обсудить агентскую модель <ArrowRight size={16} aria-hidden="true" /></a></article>
      </div>
    </section>}
    <section className="partner-model" aria-labelledby="partner-directions">
      <h2 id="partner-directions">Направления сотрудничества</h2>
      <div className="partner-grid">
        {programs.map(({ key, path: href, icon: Icon, title, summary }) => <article key={key}>
          <Icon size={24} aria-hidden="true" />
          <h3>{title}</h3><p>{summary}</p>
          <a href={base + href}>{path === '/' + href ? 'Условия и заявка' : 'Узнать условия'} <ArrowRight size={16} aria-hidden="true" /></a>
        </article>)}
      </div>
    </section>
    <section className="partner-process" aria-labelledby="partner-process-title">
      <h2 id="partner-process-title">Как начать сотрудничество</h2>
      <ol>{current.details.map(step => <li key={step}>{step}</li>)}</ol>
      <p>Закупочный прайс и условия вознаграждения согласуются индивидуально. Доступ в кабинет выдаёт менеджер после рассмотрения заявки.</p>
    </section>
    <PublicRequest base={base} initial={current.program} />
    <section className="partner-faq" aria-labelledby="partner-faq-title">
      <h2 id="partner-faq-title">Вопросы о сотрудничестве</h2>
      {PUBLIC_PARTNER_FAQ.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
    </section>
  </div>
}
