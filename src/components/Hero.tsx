import { useInView } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { useRef } from 'react'
import { HeroTitle } from './HeroTitle'
import { HomeOverview } from './CatalogFacts'
import './HomeCommerce.css'

export function Hero() {
  const ref = useRef(null)
  const visible = useInView(ref)
  return (
    <section ref={ref} className={`hero-arch hero-commerce ${visible ? 'hero-in-view' : ''}`} id="top">
      <div className="hero-arch-bg">
        <img
          src="./catalog/hero/hero.webp"
          alt="Визуализация гостиной с бамбуковыми панелями тёплого оттенка ореха"
          fetchPriority="high"
          decoding="async"
          width="1672"
          height="941"
        />
        <div className="hero-arch-veil" />
      </div>

      <div className="container hero-arch-content">
        <div className="hero-arch-text">
          <p className="hero-eyebrow hero-enter-eyebrow">Декорай · Коллекция 2026</p>
          <HeroTitle lines={['Бамбуковые', 'панели']} />

          <p className="hero-lead hero-enter-lead">
            Стеновые панели, рейки и профили для интерьера. Выберите фактуру в каталоге
            или посмотрите образцы в московском шоуруме.
          </p>

          <div className="hero-commerce-actions hero-enter-actions">
            <a href="./catalog/" className="btn btn-primary interactive">
              Открыть каталог <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#calculator" className="btn btn-white interactive">
              Рассчитать стены <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <a href="#showroom" className="hero-commerce-contact hero-enter-actions interactive">
            Связаться с менеджером
          </a>
        </div>
      </div>

      <HomeOverview />
    </section>
  )
}
