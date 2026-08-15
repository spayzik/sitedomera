import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'
import { useRef } from 'react'

const easeOutQuint = [0.22, 1, 0.36, 1] as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
}

const textMask = {
  hidden: { y: '120%', rotate: 2, transformOrigin: 'top left' },
  show: { y: '0%', rotate: 0, transition: { duration: 1.2, ease: easeOutQuint } },
}

const textMaskFlat = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: 1, ease: easeOutQuint } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: easeOutQuint } },
}

export function Hero() {
  const ref = useRef(null)
  
  // Parallax effect for the background
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])

  return (
    <section ref={ref} className="hero-arch" id="top">
      {/* Background Mask Reveal + Parallax */}
      <motion.div 
        className="hero-arch-bg"
        initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 1.6, ease: [0.7, 0, 0.1, 1] }}
        style={{ y, opacity, scale }}
      >
        <motion.img 
          src="/catalog/hero/hero-soft-new.jpg" 
          alt="Домэра интерьер"
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          transition={{ duration: 3, ease: easeOutQuint }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 42%', willChange: 'transform' }}
        />
        <div className="hero-arch-veil" />
      </motion.div>

      <div className="hero-blobs" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <div className="container hero-arch-content">
        <motion.div
          className="hero-arch-text"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <div style={{ overflow: 'hidden', paddingBottom: '0.2em' }}>
            <motion.p className="hero-eyebrow" variants={textMaskFlat}>
              Домэра · Коллекция 2026
            </motion.p>
          </div>

          <h1 style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflow: 'hidden', paddingBottom: '0.15em' }}>
              <motion.span style={{ display: 'block' }} variants={textMask}>
                Бамбуковые
              </motion.span>
            </div>
            <div style={{ overflow: 'hidden', paddingBottom: '0.15em', marginTop: '-0.1em' }}>
              <motion.span style={{ display: 'block' }} variants={textMask}>
                панели
              </motion.span>
            </div>
          </h1>

          <motion.div variants={fadeUp}>
            <p className="hero-lead">
              Высокотехнологичный бамбуковый композит. Бесшовный монтаж,
              абсолютная геометрия и премиальные фактуры для современных интерьеров.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="#/catalog" className="btn btn-white interactive" style={{ gap: '0.75rem' }}>
              Смотреть каталог <ArrowDown size={16} />
            </a>
            <a href="#showroom" className="btn btn-outline interactive" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              Записаться в шоурум
            </a>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="hero-arch-bottom"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1, ease: easeOutQuint }}
      >
        <div className="container bottom-grid">
          <div className="bottom-stat">
            <span className="label">Формат</span>
            <span className="val">1220 × 3000 мм</span>
          </div>
          <div className="bottom-stat">
            <span className="label">Толщина</span>
            <span className="val">5 мм · 13 кг</span>
          </div>
          <div className="bottom-stat">
            <span className="label">Монтаж</span>
            <span className="val">На клей, без крепежа</span>
          </div>
          <a href="#/catalog" className="btn-explore interactive">
            Открыть каталог <ArrowRight size={16} />
          </a>
        </div>
      </motion.div>
    </section>
  )
}
