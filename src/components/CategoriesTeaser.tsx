import { useState } from 'react'
import { motion } from 'framer-motion'
import { collections } from '../data/products'
import { updateCatalogHash } from '../lib/catalogNavigation'

const categories = collections.map(c => ({
  id: c.id, title: c.name, bg: c.banner,
  text: 'Позиций: ' + c.count + '. ' + c.description,
}))

export function CategoriesTeaser() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <section
      className="cat-teaser catalog-categories"
      onMouseLeave={() => setHovered(null)}
      aria-label="Категории материалов"
    >
      {categories.map((category, index) => {
        const isActive = hovered === category.id
        const isMuted = hovered !== null && !isActive

        return (
          <motion.a
            key={category.id}
            href={updateCatalogHash('#/catalog', { category: category.id })}
            aria-label={`Открыть категорию: ${category.title}`}
            className={`cat-panel interactive${isActive ? ' is-active' : ''}${isMuted ? ' is-muted' : ''}`}
            onMouseEnter={() => setHovered(category.id)}
            onFocus={() => setHovered(category.id)}
            initial={{ opacity: 0, y: 70 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <img className="cat-panel-img" src={category.bg} alt={category.title} loading="lazy" decoding="async" />
            <div className="cat-panel-shade" />

            <div className="cat-panel-content">
              <h3 className="cat-panel-title">{category.title}</h3>
              <div className="cat-card-text">
                <div className="cat-card-text-inner">
                  <p className="cat-card-copy">{category.text}</p>
                </div>
              </div>
            </div>
          </motion.a>
        )
      })}
    </section>
  )
}
