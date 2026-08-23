import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CONTACTS } from '../data/products'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          background: '#070707',
          color: '#fff',
          fontFamily: 'var(--font-body), sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <strong style={{ fontSize: '1.4rem', letterSpacing: '0.1em' }}>ДОМЭРА</strong>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '40ch', lineHeight: 1.6 }}>
            Что-то пошло не так. Мы уже в курсе — попробуйте обновить страницу
            или свяжитесь с нами напрямую.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={window.location.href} className="btn btn-primary">Обновить</a>
            <a href={`tel:${CONTACTS.phoneRaw}`} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              {CONTACTS.phone}
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
