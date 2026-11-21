import { Phone } from 'lucide-react'
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

export function SocialContacts({ placement, onFollow }: { placement: Placement; onFollow?: () => void }) {
  const showChannel = placement === 'cards' || placement === 'floating'
  return <div className={'social-contacts social-contacts-' + placement} role="group" aria-label="Способы связи">
    {(showChannel ? [...channels, telegramChannel] : channels).map(({ id, label, detail, href }) => href &&
      <a key={label} href={href} className="social-contact" data-channel={id} onClick={onFollow}
        target={id === 'phone' ? undefined : '_blank'} rel={id === 'phone' ? undefined : 'noreferrer'}
        aria-label={id === 'phone' ? 'Позвонить ' + detail : label}>
        <ChannelIcon id={id} />
        <span className="social-contact-label">{id === 'phone' && placement !== 'cards' ? detail : label}</span>
        {placement === 'cards' && <small>{detail}</small>}
      </a>)}
  </div>
}
