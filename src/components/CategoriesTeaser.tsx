import { useState } from 'react'
import { motion } from 'framer-motion'

const categories = [
  {
    id: 'wood',
    title: 'Бамбуковые панели',
    bg: 'catalog/rooms/room-wood.jpg',
    text: 'Основа коллекции — древесно-бамбуковый композит с точной имитацией натурального шпона. Идеально для теплых интерьеров.'
  },
  {
    id: 'stone',
    title: 'Гибкий камень',
    bg: 'catalog/hero/hero-new.jpg',
    text: 'Эффект декоративной штукатурки и камня. Масштабные цельные полотна без мокрых процессов и грязи.'
  },
  {
    id: 'fabric',
    title: 'Тканевые фактуры',
    bg: 'catalog/rooms/room-fabric.jpg',
    text: 'Уютные текстильные фактуры, переплетение нитей и мягкий матовый блеск. Домашний уют в прочном исполнении.'
  },
  {
    id: 'soft',
    title: 'Soft-touch',
    bg: 'catalog/hero/hero-soft-new.jpg',
    text: 'Глубокая бархатистая поверхность. Идеально матовое покрытие, невероятно приятное на ощупь.'
  },
  {
    id: 'slats',
    title: 'Реечные панели',
    bg: 'catalog/hero/banner-slats.jpg',
    text: 'Объемные 3D рейки для акцентных стен. Монтируются встык, создавая непрерывный рельеф.'
  }
]

export function CategoriesTeaser() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <section className="section" style={{ padding: 0, height: '80vh', minHeight: '600px', display: 'flex' }}>
      {categories.map((c) => {
        const isHovered = hovered === c.id
        const isMuted = hovered !== null && !isHovered

        return (
          <motion.div
            key={c.id}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered(null)}
            className="interactive"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            animate={{
              flex: isHovered ? 3 : isMuted ? 0.8 : 1,
            }}
            transition={{ duration: 0.9, delay: categories.indexOf(c) * 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'relative',
              height: '100%',
              overflow: 'hidden',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              cursor: 'none'
            }}
          >
            <motion.img
              src={c.bg}
              alt={c.title}
              animate={{
                scale: isHovered ? 1.05 : 1,
                filter: isHovered ? 'brightness(1)' : 'brightness(0.35)',
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center'
              }}
            />

            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '3rem',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)'
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 2vw, 2rem)',
                color: '#fff',
                marginBottom: '1rem',
                whiteSpace: 'nowrap',
                transition: 'transform 0.4s ease-out',
                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)'
              }}>
                {c.title}
              </h3>

              <motion.div
                initial={false}
                animate={{
                  height: isHovered ? 'auto' : 0,
                  opacity: isHovered ? 1 : 0,
                  marginTop: isHovered ? '1rem' : 0
                }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  width: 'min(320px, calc(100% - 2rem))', // Ограничиваем ширину, чтобы текст не вываливался на узких карточках
                  boxSizing: 'border-box'
                }}>
                  {c.text}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )
      })}
    </section>
  )
}
