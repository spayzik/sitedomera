import { Send } from 'lucide-react'
import { CONTACTS } from '../data/products'

export function TelegramFab() {
  const href =
    CONTACTS.telegram ||
    `https://t.me/share/url?url=${encodeURIComponent(`https://${CONTACTS.site}`)}&text=${encodeURIComponent(
      'Здравствуйте! Хочу получить консультацию по панелям Домэра.',
    )}`

  return (
    <a
      className="tg-fab interactive"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Написать в Telegram"
    >
      <Send size={20} />
    </a>
  )
}