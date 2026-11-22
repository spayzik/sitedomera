import { MessagesSquare } from 'lucide-react'
import { SocialContacts } from './SocialContacts'

export function TelegramFab({ base }: { base: string }) {
  return (
    <details className="messenger-fab">
      <summary className="tg-fab interactive" aria-label="Способы связи с ДЕКОРАЙ"><MessagesSquare size={20} aria-hidden="true" /></summary>
      <div className="messenger-fab-links">
        <SocialContacts base={base} placement="floating" />
      </div>
    </details>
  )
}
