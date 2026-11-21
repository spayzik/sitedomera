import { Phone } from 'lucide-react'
import { useState } from 'react'
import { contactLinks } from '../lib/contactLinks'
import { socialIcons } from './socialIcons'
import './SocialContacts.css'

type Placement = 'header' | 'menu' | 'cards' | 'footer' | 'floating'
type Channel = keyof typeof socialIcons | 'phone'

const channels: { id: Channel; label: string; detail: string; href?: string }[] = [
  { id: 'phone', label: 'Телефон', detail: contactLinks.phoneLabel, href: contactLinks.phone },
  { id: 'telegram', label: 'Telegram', detail: 'Написать менеджеру', href: contactLinks.telegram },
  { id: 'whatsapp', label: 'WhatsApp', detail: 'Написать менеджеру', href: contactLinks.whatsapp },
  { id: 'max', label: 'MAX', detail: 'Написать менеджеру', href: contactLinks.max },
  { id: 'instagram', label: 'Instagram', detail: 'Открыть профиль', href: contactLinks.instagram },
]
const telegramChannel = { id: 'telegram' as const, label: 'Канал в Telegram', detail: 'Открыть канал', href: contactLinks.telegramChannel }

function ChannelIcon({ id }: { id: Channel }) {
  if (id === 'phone') return <Phone size={17} aria-hidden="true" />
  return <svg width="18" height="18" viewBox={id === 'max' ? '4250 50 100 100' : '0 0 24 24'} aria-hidden="true">
    <path d={socialIcons[id]} fill={id === 'max' ? 'white' : 'currentColor'} />
  </svg>
}

function MaxByPhone() {
  const [copied, setCopied] = useState(false)
  return <div className="social-max-by-phone" id="max-contact">
    <span><ChannelIcon id="max" /> MAX</span>
    <p>Найдите нас по номеру <strong>{contactLinks.phoneLabel}</strong>.</p>
    <button type="button" className="btn btn-outline" onClick={async () => {
      try { await navigator.clipboard.writeText(contactLinks.phone.replace('tel:', '')); setCopied(true) }
      catch { setCopied(false) }
    }}>Скопировать номер</button>
    <a href="https://web.max.ru/" target="_blank" rel="noreferrer">Открыть MAX</a>
    <span className="visually-hidden" role="status">{copied ? 'Номер скопирован' : ''}</span>
  </div>
}

export function SocialContacts({ placement, base = './', onFollow }: { placement: Placement; base?: string; onFollow?: () => void }) {
  const showChannel = placement === 'cards' || placement === 'floating'
  return <div className={'social-contacts social-contacts-' + placement} role="group" aria-label="Способы связи">
    {(showChannel ? [...channels, telegramChannel] : channels).map(({ id, label, detail, href }) => {
      if (id === 'max' && !href && placement === 'cards') return <MaxByPhone key={label} />
      const maxByPhone = id === 'max' && !href
      const destination = maxByPhone ? base + 'kontakty/#max-contact' : href
      if (!destination) return null
      return (<a key={label} href={destination} className="social-contact" data-channel={id} onClick={onFollow}
        target={id === 'phone' || maxByPhone ? undefined : '_blank'} rel={id === 'phone' || maxByPhone ? undefined : 'noreferrer'}
        aria-label={id === 'phone' ? 'Позвонить ' + detail : label}>
        <ChannelIcon id={id} />
        <span className="social-contact-label">{id === 'phone' && placement !== 'cards' ? detail : label}</span>
        {placement === 'cards' && <small>{detail}</small>}
      </a>)})}
  </div>
}
