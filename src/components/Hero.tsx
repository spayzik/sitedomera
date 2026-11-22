import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ArrowDown, ArrowUpRight } from 'lucide-react'
import { useRef } from 'react'
import { LeadAction } from './LeadProvider'
import { HeroTitle } from './HeroTitle'
import { HomeOverview } from './CatalogFacts'
import './HomeCommerce.css'

export function Hero() {
  const ref = useRef(null)
  const visible = useInView(ref)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4])
  return (
    <section ref={ref} className={`hero-arch hero-commerce ${visible ? 'hero-in-view' : ''}`} id="top">
      <motion.div className="hero-arch-bg" style={reduceMotion ? undefined : { y, scale, opacity }}>
        <img
          src="./catalog/hero/hero.webp"
          alt="Визуализация гостиной с бамбуковыми панелями тёплого оттенка ореха"
          fetchPriority="high"
          decoding="async"
          width="1672"
          height="941"
        />
        <div className="hero-arch-veil" />
      </motion.div>

      <div className="container hero-arch-content">
        <div className="hero-arch-text">
          <p className="hero-eyebrow hero-enter-eyebrow">Декорай · Коллекция 2026</p>
          <HeroTitle lines={['Бамбуковые', 'панели']} />

          <p className="hero-lead hero-enter-lead">
            Стеновые панели, рейки и профили для интерьера. Выберите фактуру в каталоге
            или посмотрите образцы в московском шоуруме.
          </p>

          <div className="hero-commerce-actions hero-enter-actions">
            <a href="./catalog/" className="btn btn-white interactive">
              Открыть каталог <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#calculator" className="btn btn-outline interactive">
              Рассчитать стены <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <LeadAction intent="consultation" className="secondary-action hero-commerce-contact hero-enter-actions interactive">
            Связаться с менеджером <ArrowUpRight size={15} aria-hidden="true" />
          </LeadAction>
        </div>
      </div>

      <HomeOverview />
    </section>
  )
}
