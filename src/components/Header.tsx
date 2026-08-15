import { useEffect, useState } from 'react'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { CONTACTS } from '../data/products'
import { LogoIcon } from './Logo'
import { motion, AnimatePresence } from 'framer-motion'

const links = [
  { href: '#specs', label: 'Технологии' },
  { href: '#why', label: 'Почему мы' },
  { href: '#/catalog', label: 'Каталог' },
  { href: '#interiors', label: 'Интерьеры' },
  { href: '#installation', label: 'Монтаж' },
  { href: '#showroom', label: 'Шоурум' },
]

export function Header() {
  const { count, setOpen } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll-spy: highlight the section link currently in view
  useEffect(() => {
    const ids = ['specs', 'why', 'interiors', 'installation', 'showroom']
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(`#${e.target.id}`)
        })
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobile])

  return (
    <>
      <motion.header
        className={`site-header ${scrolled ? 'scrolled' : ''}`}
        initial={{ x: '-50%', y: -30, opacity: 0 }}
        animate={{ x: '-50%', y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="header-inner">
          <a href="#top" className="logo" aria-label="Домэра" style={{ display: 'flex', alignItems: 'center' }}>
            <LogoIcon style={{ marginRight: '0.5rem' }} />
            ДОМЭРА
          </a>

          <nav className="nav-desktop">
            {links.map((l) => (
              <a key={l.href} href={l.href} className={active === l.href ? 'active' : ''}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a className="header-phone" href={`tel:${CONTACTS.phoneRaw}`}>
              {CONTACTS.phone}
            </a>
            <button
              className="cart-btn"
              onClick={() => setOpen(true)}
              aria-label="Корзина"
            >
              <ShoppingBag size={16} style={{ marginRight: '0.4rem' }} />
              Корзина
              {count > 0 && <span className="badge">{count}</span>}
            </button>
            <button
              className="mobile-toggle"
              onClick={() => setMobile(true)}
              aria-label="Меню"
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
                  href={l.href}
                  onClick={() => setMobile(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.a
                href={`tel:${CONTACTS.phoneRaw}`}
                className="mobile-phone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {CONTACTS.phone}
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
