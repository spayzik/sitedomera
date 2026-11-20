import { Send } from 'lucide-react'
import { contactLinks } from '../lib/contactLinks'

export function TelegramFab() {
  const links = [
    ['Telegram', contactLinks.telegram],
    ['Канал в Telegram', contactLinks.telegramChannel],
    ['WhatsApp', contactLinks.whatsapp],
    ['MAX', contactLinks.max],
    ['Instagram', contactLinks.instagram],
  ]
  return (
    <details className="messenger-fab">
      <summary className="tg-fab interactive" aria-label="Написать в ДЕКОРАЙ"><Send size={20} aria-hidden="true" /></summary>
      <div className="messenger-fab-links">
        {links.map(([label, href]) => href && <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a>)}
        <a href={contactLinks.phone}>Позвонить</a>
      </div>
    </details>
  )
}
