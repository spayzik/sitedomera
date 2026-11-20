import { motion, useReducedMotion, useInView } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { useRef } from 'react'
import { EditorialReveal } from './EditorialReveal'
import { catalogSummary } from '../data/products'
import './HomeCommerce.css'

const easeOutQuint = [0.22, 1, 0.36, 1] as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0 } },
}

const textMaskFlat = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: 1, ease: easeOutQuint } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: easeOutQuint } },
}

export function Hero({ ready = true }: { ready?: boolean }) {
  const ref = useRef(null)
  const visible = useInView(ref)
  const reducedMotion = useReducedMotion()
  return (
    <section ref={ref} className={`hero-arch hero-commerce ${visible ? 'hero-in-view' : ''}`} id="top">
      <div className="hero-arch-bg">
        <img
          src="catalog/hero/hero.webp"
          alt="Визуализация гостиной с бамбуковыми панелями тёплого оттенка ореха"
          fetchPriority="high"
          decoding="async"
          width="1672"
          height="941"
        />
        <div className="hero-arch-veil" />
      </div>

      <div className="container hero-arch-content">
        <motion.div
          className="hero-arch-text"
          variants={stagger}
          initial={reducedMotion ? false : "hidden"}
          animate={ready || reducedMotion ? "show" : "hidden"}
        >
          <div style={{ overflow: 'hidden', paddingBottom: '0.2em' }}>
            <motion.p className="hero-eyebrow" variants={textMaskFlat}>
              Декорай · Коллекция 2026
            </motion.p>
          </div>

          <h1 aria-label="Бамбуковые панели">
            <EditorialReveal className="hero-title-reveal" ready={ready} lines={['Бамбуковые', 'панели']} />
          </h1>

          <motion.div variants={fadeUp}>
            <p className="hero-lead">
              Стеновые панели, рейки и профили для интерьера. Выберите фактуру в каталоге
              или посмотрите образцы в московском шоуруме.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="hero-commerce-actions">
            <a href="./catalog/" className="btn btn-primary interactive">
              Открыть каталог <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#calculator" className="btn btn-white interactive">
              Рассчитать стены <ArrowDown size={16} aria-hidden="true" />
            </a>
          </motion.div>
          <motion.a variants={fadeUp} href="#showroom" className="hero-commerce-contact interactive">
            Связаться с менеджером
          </motion.a>
        </motion.div>
      </div>

      <div className="hero-arch-bottom">
        <div className="container hero-commerce-facts">
          <span>{catalogSummary.productCount} позиций · {catalogSummary.categoryCount} категорий</span>
          <a href="#showroom" className="interactive">Шоурум в Москве <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  )
}
