import { Send } from 'lucide-react'
import { CONTACTS } from '../data/products'

export function TelegramFab() {
  return (
    <a
      className="tg-fab interactive"
      href={CONTACTS.telegram}
      target="_blank"
      rel="noreferrer"
      aria-label="Написать в Telegram"
    >
      <Send size={20} />
    </a>
  )
}
