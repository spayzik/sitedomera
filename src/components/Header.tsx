import { useEffect, useState } from 'react'
import { Menu, X, ShoppingBag, Send } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { contactLinks } from '../lib/contactLinks'
import { LeadAction } from './LeadProvider'
import { LogoIcon } from './Logo'
import { motion, AnimatePresence } from 'framer-motion'
import { useDialog } from '../lib/useDialog'

const links = [
  { href: '#specs', label: 'Технологии' },
  { href: '#why', label: 'Почему мы' },
  { href: 'catalog/', label: 'Каталог' },
  { href: '#interiors', label: 'Интерьеры' },
  { href: 'montazh/', label: 'Монтаж' },
  { href: 'showroom/', label: 'Шоурум' },
]

export function Header({ base = './', path = '/' }: { base?: string; path?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const selected = path.startsWith('/catalog/') ? 'catalog/' : path.slice(1)
  const href = (target: string) => path === '/' && target.startsWith('#') ? target : base + target
  const { count, setOpen } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [active, setActive] = useState('')
  const menuRef = useDialog(mobile, () => setMobile(false))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Resolve sections on scroll: lazy sections and returning Home replace DOM nodes.
  useEffect(() => {
    const ids = ['specs', 'why', 'interiors', 'installation', 'showroom']
    let frame = 0
    const update = () => {
      frame = 0
      if (window.location.hash.startsWith('#/catalog')) {
        setActive('catalog/')
        return
      }
      const point = window.innerHeight * 0.45
      const id = ids.find(id => {
        const bounds = document.getElementById(id)?.getBoundingClientRect()
        return bounds && bounds.top <= point && bounds.bottom >= point
      })
      setActive(id ? `#${id}` : '')
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('hashchange', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('hashchange', schedule)
    }
  }, [])

  return (
    <>
      <motion.header
        className={`site-header ${scrolled ? 'scrolled' : ''}`}
        initial={false}
        animate={{ x: '-50%', y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="header-inner">
          <a href={base} className="logo" aria-label="Декорай" style={{ display: 'flex', alignItems: 'center' }}>
            <LogoIcon style={{ marginRight: '0.5rem' }} />
            ДЕКОРАЙ
          </a>

          <nav className="nav-desktop">
            {links.map((l) => (
              <a key={l.href} href={href(l.href)} className={(selected || active) === l.href ? 'active' : ''}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a className="header-phone" href={contactLinks.phone}>
              {contactLinks.phoneLabel}
            </a>
            <a className="header-messenger" href={contactLinks.telegram} target="_blank"
              rel="noreferrer" aria-label="Написать в Telegram">
              <Send size={17} aria-hidden="true" />
            </a>
            <button
              className="cart-btn"
              onClick={() => setOpen(true)}
              aria-label="Корзина"
            >
              <ShoppingBag size={16} style={{ marginRight: '0.4rem' }} />
              Корзина
              {mounted && count > 0 && <span className="badge">{count}</span>}
            </button>
            <button
              className="mobile-toggle"
              onClick={() => setMobile(true)}
              aria-label="Меню"
              aria-expanded={mobile}
              aria-controls="mobile-menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobile && (
          <motion.div
            className="mobile-menu"
            id="mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Навигация"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="close-menu" onClick={() => setMobile(false)} aria-label="Закрыть">
              <X size={28} />
            </button>
            <nav className="nav-mobile">
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={href(l.href)}
                  onClick={() => setMobile(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.a
                href={contactLinks.phone}
                className="mobile-phone"
                onClick={() => setMobile(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {contactLinks.phoneLabel}
              </motion.a>
              <LeadAction intent="consultation" className="btn btn-outline interactive">Получить консультацию</LeadAction>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
