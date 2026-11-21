import { Send } from 'lucide-react'
import { SocialContacts } from './SocialContacts'

export function TelegramFab() {
  return (
    <details className="messenger-fab">
      <summary className="tg-fab interactive" aria-label="Написать в ДЕКОРАЙ"><Send size={20} aria-hidden="true" /></summary>
      <div className="messenger-fab-links">
        <SocialContacts placement="floating" />
      </div>
    </details>
  )
}
