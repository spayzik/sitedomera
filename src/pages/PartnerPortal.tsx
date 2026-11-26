import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Download, LockKeyhole } from 'lucide-react'
import { CONTACTS, products } from '../data/products'
import { partnerPrograms, programTitle } from '../data/partnerPrograms'
import { useCart } from '../context/CartContext'
import {
  loadPartnerSession, partnerError, partnerPreview, sendPartnerCommand,
  type PartnerAccount, type PartnerItem, type PartnerManager, type PartnerSession,
} from '../lib/partnersClient'

type Command = { action: string } & Record<string, unknown>
type Execute = (command: Command) => Promise<boolean>
const catalog = new Map(products.map(item => [item.id, item]))
const formatDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'Europe/Moscow' })
const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })
const stateNames: Record<string, string> = {
  active: 'Активен', disabled: 'Приостановлен', pending: 'На рассмотрении', approved: 'Одобрено',
  accepted: 'Принято', rejected: 'Отклонено', confirmed: 'Подтверждено', conflict: 'Проверка атрибуции',
  linked: 'Связан', paid: 'Оплачен', partially_refunded: 'Частичный возврат', refunded: 'Возврат',
  cancelled: 'Отменён', canceled: 'Отменён', processing: 'В обработке', shipped: 'Отгружен', delivered: 'Доставлен',
  return_requested: 'Запрошен возврат', return_resolved: 'Возврат обработан', return_declined: 'В возврате отказано',
}

const label = (status?: string) => status ? stateNames[status] ?? status : 'Статус уточняется'
const date = (timestamp?: number) => timestamp ? formatDate.format(new Date(timestamp * 1000)) : ''
const amount = (minor?: number) => typeof minor === 'number' ? rubles.format(minor / 100) : '—'
const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
const optionalNumber = (data: FormData, name: string) => data.get(name) ? Number(data.get(name)) : undefined

function Form({ children, command, execute, busy, action }: {
  children: ReactNode; command: (data: FormData) => Command; execute: Execute; busy: boolean; action: string
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    if (await execute(command(new FormData(form)))) form.reset()
  }

  return <form className="partner-form" onSubmit={submit}>
    {children}
    <button className="btn btn-outline interactive" type="submit" disabled={busy}>{action}</button>
  </form>
}

function Panel({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="partner-panel" open={open || undefined}>
    <summary>{title}</summary><div className="partner-panel-body">{children}</div>
  </details>
}

function List({ children, empty }: { children: ReactNode[]; empty: string }) {
  return children.length ? <ul className="partner-records">{children}</ul> : <p className="partner-empty">{empty}</p>
}

function download(name: string, content: string, format: 'text' | 'csv') {
  const url = URL.createObjectURL(new Blob([format === 'csv' ? '\uFEFF' : '', content], {
    type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
  }))
  const a = document.createElement('a')
  a.href = url
  a.download = name + (format === 'csv' ? '.csv' : '.txt')
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function Items({ items }: { items: PartnerItem[] }) {
  if (!items.length) return null
  return <ul className="partner-item-list">{items.map(({ id, quantity }) => {
    const product = catalog.get(id)
    return <li key={id}>{product?.name ?? id}{product?.sku && product.sku !== product.name ? ' · ' + product.sku : ''} × {quantity} {product?.unit}</li>
  })}</ul>
}

function exportProject(items: PartnerItem[]) {
  const cell = (value: string) => '"' + (/^\s*[=+\-@\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"'
  const rows = items.map(({ id, quantity }) => {
    const product = catalog.get(id)
    return [product?.sku ?? id, product?.name ?? id, String(quantity), product?.unit ?? ''].map(cell).join(',')
  })
  download('dekoray-specification', ['Артикул,Материал,Количество,Единица', ...rows].join('\r\n'), 'csv')
}

function Finance({ data }: { data: Pick<PartnerAccount, 'accruals' | 'adjustments' | 'payouts'> }) {
  return <>
    <h3>Начисления</h3>
    <List empty="Подтверждённых начислений пока нет.">{data.accruals.map(entry =>
      <li key={entry.order_id ?? entry.id}>
        <strong>Заказ {entry.order_id ?? entry.id}</strong>
        <span>Начислено {amount(entry.amount_minor)} · Учтено выплат {amount(entry.paid_minor)}</span>
        {(entry.available_at || entry.policy_version) && <span>{[entry.available_at ? 'Доступно с ' + date(entry.available_at) : '', entry.policy_version ? 'Версия ' + entry.policy_version : ''].filter(Boolean).join(' · ')}</span>}
      </li>)}</List>
    <h3>Корректировки</h3>
    <List empty="Корректировок пока нет.">{data.adjustments.map((entry, index) =>
      <li key={entry.id ?? String(index)}><strong>Заказ {entry.order_id ?? entry.id}</strong>
        <span>{amount(entry.delta_minor)} · {date(entry.created_at)}</span></li>)}</List>
    <h3>Зафиксированные выплаты</h3>
    <List empty="Выплат пока нет.">{data.payouts.map(entry =>
      <li key={(entry.order_id ?? '') + (entry.reference ?? entry.id)}><strong>{amount(entry.amount_minor)}</strong>
        <span>{entry.reference} · {date(entry.created_at)}</span></li>)}</List>
  </>
}

function Account({ data, base, execute, busy }: { data: PartnerAccount; base: string; execute: Execute; busy: boolean }) {
  const { items, setOpen } = useCart()
  const [copied, setCopied] = useState(false)
  const link = CONTACTS.origin + '/?ref=' + encodeURIComponent(data.profile.code)
  const snapshot = items.map(({ product, qty }) => ({ id: product.id, quantity: qty }))
  const cartLabel = items.length ? 'Приложить корзину (' + items.length + ' поз.)' : 'Выбрать материалы в каталоге'
  const cartOption = items.length
    ? <div className="partner-inline"><label className="partner-checkbox"><input type="checkbox" name="includeCart" defaultChecked /> {cartLabel}</label>
      <button className="partner-text-button" type="button" onClick={() => setOpen(true)}>Посмотреть</button></div>
    : <a className="partner-text-button" href={base + 'catalog/'}>{cartLabel}</a>

  return <>
    <div className="partner-profile">
      <div><h2>{data.profile.name}</h2><p>{programTitle(data.profile.program)} · {label(data.profile.status)}</p><p>{data.profile.email}</p></div>
      <div><label>Персональная ссылка<input value={link} readOnly /></label>
        <div className="partner-inline"><span>Код <strong>{data.profile.code}</strong></span>
          <button className="partner-text-button" type="button" onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true), () => setCopied(false))}>Скопировать</button>
          {copied && <span role="status">Ссылка скопирована</span>}
        </div>
      </div>
    </div>

    <Panel title="Условия и документы" open>
      {data.conditions ? <div className="partner-records">
        <strong>Версия {data.conditions.version} · действует с {date(data.conditions.effectiveAt)}</strong>
        {data.conditions.level && <p>Уровень {data.conditions.level}</p>}<p>{data.conditions.text}</p>
      </div> : <p className="partner-empty">Документы и согласованный прайс появятся после назначения менеджером.</p>}
      <List empty="У вас пока нет доступных документов.">{data.documents.map(doc =>
        <li key={doc.id}><strong>{doc.title}</strong><span>{date(doc.createdAt)}</span>
          <button className="partner-text-button" type="button" onClick={() => download('dekoray-' + doc.id, doc.content, doc.format)}>
            <Download size={16} aria-hidden="true" /> Скачать {doc.format === 'csv' ? 'CSV' : 'текст'}
          </button>
        </li>)}</List>
    </Panel>

    <Panel title="Подборки и проекты">
      <Form action="Сохранить проект" execute={execute} busy={busy} command={form => ({
        action: 'project_create', name: field(form, 'name'), area: optionalNumber(form, 'area'), items: form.has('includeCart') ? snapshot : [],
      })}>
        <label>Название проекта<input name="name" required minLength={2} maxLength={120} /></label>
        <label>Площадь, м² <small>укажите, если нет списка материалов</small><input name="area" type="number" min="0.01" max="100000" step="any" /></label>
        {cartOption}
      </Form>
      <List empty="Сохранённых проектов пока нет.">{data.projects.map(project =>
        <li key={project.id}><strong>{project.name}</strong><span>{[project.area ? project.area + ' м²' : '', date(project.createdAt)].filter(Boolean).join(' · ')}</span>
          <Items items={project.items} />
          {project.items.length > 0 && <button className="partner-text-button" type="button" onClick={() => exportProject(project.items)}><Download size={16} aria-hidden="true" /> Скачать спецификацию</button>}
        </li>)}</List>
    </Panel>

    <Panel title="Запросы на поставку и образцы">
      <Form action="Отправить запрос" execute={execute} busy={busy} command={form => ({
        action: 'request_create', program: field(form, 'program'), name: field(form, 'name'), details: field(form, 'details'),
        area: optionalNumber(form, 'area'), items: form.has('includeCart') ? snapshot : [],
      })}>
        <label>Направление<select name="program" defaultValue={data.profile.program}>
          {Object.entries(partnerPrograms).map(([key, program]) => <option key={key} value={key}>{program.title}</option>)}
        </select></label>
        <label>Тема запроса<input name="name" required minLength={2} maxLength={120} placeholder="Например, образцы для офиса" /></label>
        <label>Площадь, м²<input name="area" type="number" min="0.01" max="100000" step="any" /></label>
        <label>Детали<textarea name="details" rows={3} maxLength={1400} /></label>
        {cartOption}
      </Form>
      <List empty="Запросов пока нет.">{data.requests.map(request =>
        <li key={request.id}><strong>{request.name}</strong><span>{label(request.status)} · {date(request.createdAt)}</span><Items items={request.items} />
          {request.returnCase && <p>{request.returnCase}</p>}
          {request.program === 'dropshipping_resale' && request.status === 'delivered' && <Form action="Зарегистрировать возврат" execute={execute} busy={busy} command={form => ({
            action: 'request_return', id: request.id, details: field(form, 'details'),
          })}>
            <label>Что нужно проверить<textarea name="details" rows={3} minLength={2} maxLength={1400} required /></label>
          </Form>}
        </li>)}</List>
    </Panel>

    <Panel title="Приведённые клиенты">
      <Form action="Зарегистрировать обращение" execute={execute} busy={busy} command={form => ({
        action: 'referral_create', clientEmail: field(form, 'clientEmail'), details: field(form, 'details'), consent: form.has('consent'),
      })}>
        <label>Электронная почта клиента<input type="email" name="clientEmail" autoComplete="off" required maxLength={254} /></label>
        <label>Детали обращения<textarea name="details" rows={3} maxLength={1400} /></label>
        <label className="partner-checkbox"><input type="checkbox" name="consent" required /> У клиента есть согласие на передачу этих данных ДЕКОРАЙ.</label>
      </Form>
      <List empty="Подтверждённых обращений пока нет.">{data.referrals.map(referral =>
        <li key={referral.id}><strong>{referral.id}</strong><span>{label(referral.status)} · {date(referral.createdAt)}</span></li>)}</List>
    </Panel>

    <Panel title="Собственные заказы">
      <List empty="Связанных заказов пока нет.">{data.orders.map(order =>
        <li key={order.id}><strong>{order.id}</strong><span>{label(order.status)} · {date(order.createdAt)}</span>{(order.referralId || order.requestId) && <span>Основание {order.referralId ?? order.requestId}</span>}</li>)}</List>
    </Panel>
    <Panel title="Начисления и выплаты"><Finance data={data} /></Panel>
  </>
}

function Decision({ actions, execute, busy }: { actions: { title: string; command: Command }[]; execute: Execute; busy: boolean }) {
  return <div className="partner-actions">
    {actions.map(item => <button key={item.title} type="button" className="btn btn-outline interactive" disabled={busy} onClick={() => void execute(item.command)}>{item.title}</button>)}
  </div>
}

function Manager({ data, execute, busy, admin }: { data: PartnerManager; execute: Execute; busy: boolean; admin: boolean }) {
  const active = data.partners.filter(partner => partner.status === 'active')
  const payable = data.accruals.filter(entry => entry.order_id && entry.available_at && entry.available_at <= Date.now() / 1000 && (entry.amount_minor ?? 0) > (entry.paid_minor ?? 0))
  const partnerOptions = active.map(partner => <option key={partner.id} value={partner.id}>{partner.name} · {partner.email}</option>)
  const orderOptions = [
    ...data.referrals.filter(referral => referral.status === 'confirmed').map(referral =>
      ({ type: 'referralId', id: referral.id, label: 'Обращение · ' + (referral.clientEmail ?? referral.id) + ' · ' + (referral.code ?? '') })),
    ...data.requests.filter(request => ['accepted', 'processing', 'shipped', 'delivered'].includes(request.status)).map(request =>
      ({ type: 'requestId', id: request.id, label: 'Запрос · ' + request.name })),
  ]
  const resaleActions: Record<string, [string, string][]> = {
    accepted: [['processing', 'Передать в обработку'], ['canceled', 'Отменить поставку']],
    processing: [['shipped', 'Отметить отгрузку'], ['canceled', 'Отменить поставку']],
    shipped: [['delivered', 'Подтвердить доставку']],
    return_requested: [['return_resolved', 'Отметить завершение возврата'], ['return_declined', 'Отклонить возврат']],
  }

  return <>
    <Panel title="Входящие заявки" open>
      <List empty="Входящих заявок пока нет.">{data.applications.map(app =>
        <li key={app.id}><strong>{app.name} · {programTitle(app.program)}</strong><span>{app.email} · {label(app.status)} · {date(app.createdAt)}</span>
          {app.details && <p>{app.details}</p>}
          {app.status === 'pending' && <Decision execute={execute} busy={busy} actions={[
            { title: 'Одобрить', command: { action: 'application_review', id: app.id, status: 'approved' } },
            { title: 'Отклонить', command: { action: 'application_review', id: app.id, status: 'rejected' } },
          ]} />}
        </li>)}</List>
    </Panel>
    <Panel title="Партнёры, условия и прайсы">
      <List empty="Одобренных партнёров пока нет.">{data.partners.map(partner =>
        <li key={partner.id}><strong>{partner.name} · {programTitle(partner.program)}</strong><span>{partner.email} · {label(partner.status)} · {partner.code}</span>
          {admin && <Decision execute={execute} busy={busy} actions={[{ title: partner.status === 'active' ? 'Приостановить доступ' : 'Восстановить доступ',
            command: { action: 'partner_status_set', id: partner.id, status: partner.status === 'active' ? 'disabled' : 'active' } }]} />}
        </li>)}</List>
      {active.length > 0 && <div className="partner-manager-forms">
        <Form action="Назначить условия" execute={execute} busy={busy} command={form => ({
          action: 'conditions_set', partnerId: field(form, 'partnerId'), version: field(form, 'version'),
          text: field(form, 'text'), level: field(form, 'level'), effectiveAt: Math.floor(new Date(field(form, 'effectiveAt') + 'T00:00:00+03:00').valueOf() / 1000),
        })}>
          <label>Партнёр<select required name="partnerId">{partnerOptions}</select></label>
          <label>Версия условий<input required name="version" maxLength={64} pattern="[A-Za-z0-9._\-]+" /></label>
          <label>Действует с <small>по Москве</small><input required type="date" name="effectiveAt" /></label>
          <label>Уровень<input name="level" maxLength={80} /></label>
          <label>Согласованный текст<textarea required name="text" minLength={2} maxLength={3500} rows={4} /></label>
        </Form>
        <Form action="Опубликовать документ партнёру" execute={execute} busy={busy} command={form => ({
          action: 'document_set', partnerId: field(form, 'partnerId'), title: field(form, 'title'),
          format: field(form, 'format'), content: field(form, 'content'),
        })}>
          <label>Партнёр<select required name="partnerId">{partnerOptions}</select></label>
          <label>Название документа<input required name="title" minLength={2} maxLength={120} /></label>
          <label>Формат<select name="format"><option value="text">Текст</option><option value="csv">CSV с запятыми</option></select></label>
          <label>Содержание<textarea required name="content" maxLength={10000} rows={6} /></label>
        </Form>
        <Form action="Связать с контрагентом" execute={execute} busy={busy} command={form => ({
          action: 'counterparty_link', id: field(form, 'partnerId'), crmCounterpartyId: field(form, 'crmCounterpartyId'), identityVerified: form.has('verified'),
        })}>
          <label>Партнёр<select required name="partnerId">{partnerOptions}</select></label>
          <label>ID контрагента в МойСклад<input required name="crmCounterpartyId" maxLength={36} /></label>
          <label className="partner-checkbox"><input required type="checkbox" name="verified" /> Контрагент сверен с партнёром</label>
        </Form>
      </div>}
    </Panel>
    <Panel title="Запросы на поставку">
      <List empty="Запросов пока нет.">{data.requests.map(request =>
        <li key={request.id}><strong>{request.name} · {programTitle(request.program)}</strong><span>{label(request.status)} · {date(request.createdAt)}</span>
          {request.details && <p>{request.details}</p>}<Items items={request.items} />
          {request.returnCase && <p>{request.returnCase}</p>}
          {request.status === 'pending'
            ? <Decision execute={execute} busy={busy} actions={[
              { title: 'Принять запрос', command: { action: 'request_review', id: request.id, status: 'accepted' } },
              { title: 'Отклонить запрос', command: { action: 'request_review', id: request.id, status: 'rejected' } },
            ]} />
            : request.program === 'dropshipping_resale' && resaleActions[request.status] && <Decision execute={execute} busy={busy}
              actions={resaleActions[request.status].map(([status, title]) => ({ title, command: { action: 'request_review', id: request.id, status } }))} />}
        </li>)}</List>
    </Panel>
    <Panel title="Обращения и атрибуция">
      <List empty="Обращений пока нет.">{data.referrals.map(referral =>
        <li key={referral.id}><strong>{referral.clientEmail ?? referral.id}</strong>
          <span>{referral.code} · {label(referral.status)} · {date(referral.createdAt)}</span>{referral.details && <p>{referral.details}</p>}
          {['pending', 'conflict'].includes(referral.status) && <Decision execute={execute} busy={busy} actions={[
            { title: 'Подтвердить обращение', command: { action: 'referral_review', id: referral.id, status: 'confirmed' } },
            { title: 'Отклонить обращение', command: { action: 'referral_review', id: referral.id, status: 'rejected' } },
          ]} />}
        </li>)}</List>
      {orderOptions.length > 0 && <Form action="Привязать подтверждённый заказ" execute={execute} busy={busy} command={form => {
        const [type, id] = field(form, 'orderBasis').split(':')
        return { action: 'order_link', id: field(form, 'id'), [type]: id, identityVerified: form.has('verified') }
      }}>
        <label>Подтверждённое обращение или запрос<select name="orderBasis" required>
          {orderOptions.map(option => <option key={option.type + option.id} value={option.type + ':' + option.id}>{option.label}</option>)}
        </select></label>
        <label>ID заказа в контуре оплаты<input required name="id" maxLength={36} /></label>
        <label className="partner-checkbox"><input required type="checkbox" name="verified" /> Клиент и заказ сверены</label>
      </Form>}
      <List empty="Связанных заказов пока нет.">{data.orders.map(order =>
        <li key={order.id}><strong>Заказ {order.id}</strong><span>{label(order.status)} · {date(order.createdAt)}</span></li>)}</List>
    </Panel>
    <Panel title="Начисления и отметка о выплате">
      <Finance data={data} />
      {payable.length > 0 && <Form action="Зафиксировать выполненную выплату" execute={execute} busy={busy} command={form => ({
        action: 'payout_record', id: field(form, 'id'), reference: field(form, 'reference'), amountMinor: Math.round(Number(field(form, 'amount')) * 100),
      })}>
        <label>Заказ<select required name="id">{payable.map(entry =>
          <option key={entry.order_id} value={entry.order_id}>{entry.order_id} · {amount((entry.amount_minor ?? 0) - (entry.paid_minor ?? 0))}</option>)}</select></label>
        <label>Сумма выплаты, ₽<input required type="number" min=".01" step=".01" name="amount" /></label>
        <label>Номер подтверждения оплаты<input required name="reference" minLength={5} maxLength={80} pattern="[A-Za-z0-9._\-]+" /></label>
        <label className="partner-checkbox"><input required type="checkbox" /> Выплата уже проведена</label>
      </Form>}
    </Panel>
  </>
}

export function PartnerPortal({ base, manager }: { base: string; manager: boolean }) {
  const [session, setSession] = useState<PartnerSession | 'loading' | 'unavailable'>(partnerPreview ? 'unavailable' : 'loading')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const title = manager ? 'Рабочее место менеджера' : 'Кабинет партнёра'

  useEffect(() => {
    if (partnerPreview) return
    const controller = new AbortController()
    loadPartnerSession(controller.signal).then(setSession, () => {
      if (!controller.signal.aborted) setSession('unavailable')
    })
    return () => controller.abort()
  }, [])

  async function execute(command: Command) {
    if (busy || typeof session !== 'object') return false
    setBusy(true); setNotice(''); setError('')
    try {
      if (command.action === 'login' || command.action === 'logout') {
        setSession((await sendPartnerCommand<PartnerSession>(session.csrf, command)).value)
      } else {
        await sendPartnerCommand(session.csrf, command)
        setNotice('Изменение сохранено.')
        try { setSession(await loadPartnerSession()) }
        catch { setSession('unavailable') }
      }
      return true
    } catch (reason) { setError(partnerError(reason)); return false }
    finally { setBusy(false) }
  }

  return <div className="partner-page partner-portal container page-section">
    <nav className="page-crumbs" aria-label="Хлебные крошки"><a href={base}>ДЕКОРАЙ</a><a href={base + 'partners/'}>Партнёрам</a><span aria-current="page">{title}</span></nav>
    <header className="page-intro"><p className="hero-eyebrow">ДЕКОРАЙ · Партнёрам</p><h1>{title}</h1></header>
    {session === 'loading' && <p className="partner-empty" role="status">Проверяем доступность кабинета…</p>}
    {session === 'unavailable' && <div className="partner-contact-card partner-gate">
      <LockKeyhole size={26} aria-hidden="true" /><h2>{partnerPreview ? 'Защищённый кабинет на основном сайте' : 'Кабинет пока недоступен'}</h2>
      <p>{partnerPreview ? 'На демонстрационной витрине доступны обзор программы и контакты. Условия и заказы открываются только после входа в защищённый кабинет.' : 'Перед повторной попыткой проверьте подключение или уточните доступ у менеджера.'}</p>
      <a className="btn btn-outline interactive" href={base + 'partners/'}>О партнёрской программе <ArrowRight size={16} aria-hidden="true" /></a>
    </div>}
    {typeof session === 'object' && <div className="partner-protected ym-hide-content">
      {error && <p className="partner-error" role="alert">{error}</p>}
      {notice && <p className="partner-receipt" role="status">{notice}</p>}
      {!session.user ? <div className="partner-contact-card partner-gate">
        <LockKeyhole size={26} aria-hidden="true" /><h2>Вход</h2>
        <p>{manager ? 'Используйте рабочую учётную запись.' : 'Данные для входа выдаёт менеджер после одобрения заявки.'}</p>
        <Form execute={execute} busy={busy} action="Войти" command={data => ({
          action: 'login', email: field(data, 'email'), password: String(data.get('password') ?? ''),
        })}>
          <label>Электронная почта<input required type="email" name="email" autoComplete="username" maxLength={254} /></label>
          <label>Пароль<input required type="password" name="password" autoComplete="current-password" maxLength={512} /></label>
        </Form>
      </div> : <>
        <div className="partner-portal-nav">
          {session.user.role === 'partner'
            ? <a href={base + 'partners/account/'}>Кабинет партнёра</a>
            : <a href={base + 'partners/manage/'}>Рабочее место менеджера</a>}
          <button type="button" className="btn btn-outline interactive" disabled={busy} onClick={() => void execute({ action: 'logout' })}>Выйти</button>
        </div>
        {manager && session.manager && ['manager', 'admin'].includes(session.user.role)
          ? <Manager data={session.manager} execute={execute} busy={busy} admin={session.user.role === 'admin'} />
          : !manager && session.account && session.user.role === 'partner'
            ? <Account data={session.account} base={base} execute={execute} busy={busy} />
            : <p className="partner-empty" role="status">У вашей учётной записи нет доступа к этой странице.</p>}
      </>}
    </div>}
  </div>
}
