import { useState } from 'react'
import { motion } from 'framer-motion'

const categories = [
  {
    id: 'wood',
    title: 'Бамбуковые панели',
    bg: 'catalog/rooms/room-wood.webp',
    text: 'Основа коллекции — древесно-бамбуковый композит с точной имитацией натурального шпона. Идеально для тёплых интерьеров.',
  },
  {
    id: 'stone',
    title: 'Гибкий камень',
    bg: 'catalog/rooms/room-plaster.webp',
    text: 'Эффект декоративной штукатурки и камня. Масштабные цельные полотна без мокрых процессов и грязи.',
  },
  {
    id: 'fabric',
    title: 'Тканевые фактуры',
    bg: 'catalog/rooms/room-fabric.webp',
    text: 'Уютные текстильные фактуры, переплетение нитей и мягкий матовый блеск. Домашний уют в прочном исполнении.',
  },
  {
    id: 'soft',
    title: 'Soft-touch',
    bg: 'catalog/hero/hero-soft-new.webp',
    text: 'Глубокая бархатистая поверхность. Идеально матовое покрытие, невероятно приятное на ощупь.',
  },
  {
    id: 'slats',
    title: 'Реечные панели',
    bg: 'catalog/hero/banner-slats.webp',
    text: 'Объёмные 3D рейки для акцентных стен. Монтируются встык, создавая непрерывный рельеф.',
  },
]

export function CategoriesTeaser() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <section
      className="cat-teaser"
      onMouseLeave={() => setHovered(null)}
      aria-label="Категории материалов"
    >
      {categories.map((category, index) => {
        const isActive = hovered === category.id
        const isMuted = hovered !== null && !isActive

        return (
          <motion.article
            key={category.id}
            className={`cat-panel interactive${isActive ? ' is-active' : ''}${isMuted ? ' is-muted' : ''}`}
            onMouseEnter={() => setHovered(category.id)}
            onFocus={() => setHovered(category.id)}
            initial={{ opacity: 0, y: 70 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <img className="cat-panel-img" src={category.bg} alt={category.title} />
            <div className="cat-panel-shade" />

            <div className="cat-panel-content">
              <h3 className="cat-panel-title">{category.title}</h3>
              <div className="cat-card-text">
                <div className="cat-card-text-inner">
                  <p className="cat-card-copy">{category.text}</p>
                </div>
              </div>
            </div>
          </motion.article>
        )
      })}
    </section>
  )
}
