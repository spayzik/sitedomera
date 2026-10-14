import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collections, products, type CollectionId, type Product, formatDimensions } from '../data/products'
import { useCart } from '../context/CartContext'
import { ProductModal } from './ProductModal'
import { TiltCard } from './TiltCard'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'

const FEATURED = collections.slice(0, 6).map(c => products.find(p => p.categoryId === c.id)!.id)

export function Catalog() {
  const [filter, setFilter] = useState<CollectionId | 'all'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { add } = useCart()

  const list = filter === 'all' ? products : products.filter((p) => p.categoryId === filter)
  const preview = filter === 'all' ? FEATURED.map(id => products.find(p => p.id === id)!).filter(Boolean) : list

  return (
    <>
      <section className="section catalog" id="catalog">
        <div className="container">
          <div className="catalog-header">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2>Коллекция<br/>материалов</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
              <p className="lead">
                {products.length} позиций: панели, гибкий камень, рейки и профили.
                Выберите фактуру для детального изучения.
              </p>
              <a href="#/catalog" className="btn btn-white interactive">
                Открыть полный каталог <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="filters-arch">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              Все ({products.length})
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                className={filter === c.id ? 'active' : ''}
                onClick={() => setFilter(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <motion.div className="grid-arch" layout>
            <AnimatePresence mode="popLayout">
              {preview.slice(0, 9).map((p, i) => (
                <motion.div
                  key={p.id}
                  className="card-arch"
                  initial={{ opacity: 0, scale: 0.95, y: 100 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setSelectedProduct(p)}
                >
                  <div className="card-arch-img">
                    <TiltCard>
                      <img src={p.image} alt={p.name} loading="lazy" className="img-main" />
                      <img src={p.swatch} alt="" loading="lazy" className="img-hover" />
                    </TiltCard>
                    <div className="card-arch-tag">
                      {collections.find(c => c.id === p.categoryId)?.name}
                    </div>
                    <div className="card-arch-overlay">
                      <button className="btn-view" aria-label={`Подробнее: ${p.name}`} onClick={(e) => { e.stopPropagation(); setSelectedProduct(p) }}>Смотреть детали</button>
                      <button
                        className="btn-mini-add interactive"
                        onClick={(e) => { e.stopPropagation(); add(p) }}
                        aria-label="Добавить в подборку"
                      >
                        <ShoppingBag size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="card-arch-info">
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.sku ? `${p.sku} · ` : ''}{formatDimensions(p)}</p>
                    </div>
                    <p className="card-arch-price">{p.priceRub.toLocaleString('ru-RU')} ₽/{p.unit}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="catalog-more">
            <a href="#/catalog" className="btn btn-primary interactive">
              Смотреть все {products.length} позиций
            </a>
          </div>
        </div>
      </section>

      <ProductModal selected={selectedProduct} onSelect={setSelectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  )
}
