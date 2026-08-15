import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const features = [
  'Собственные бригады с опытом более 5 лет',
  'Чистый монтаж на клей: без пыли и шума',
  'Идеальная подгонка углов и стыковка профилей',
  'Официальная гарантия на работы'
]

export function Installation() {
  return (
    <section className="section installation" id="installation" style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <div className="split-grid" style={{ alignItems: 'center' }}>
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">Наши услуги</p>
            <h2>Профессиональный<br/>монтаж «под ключ»</h2>
            <p className="lead" style={{ marginBottom: '2.5rem' }}>
              Мы предлагаем премиальные материалы и гарантируем их безупречную установку. Доверьте монтаж профессионалам Домэра, чтобы получить идеальный результат без лишних хлопот.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
              {features.map((f, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
                >
                  <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)' }}>{f}</span>
                </motion.div>
              ))}
            </div>

            <a href="#showroom" className="btn btn-primary interactive">
              Рассчитать стоимость монтажа
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', aspectRatio: '4/5', borderRadius: '8px', overflow: 'hidden' }}
          >
            <img 
              src="catalog/rooms/room-metal.jpg" 
              alt="Панели после монтажа" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
            <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem' }}>
              <div style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1, marginBottom: '0.5rem' }}>1 день</div>
              <p style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>Среднее время монтажа комнаты</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
