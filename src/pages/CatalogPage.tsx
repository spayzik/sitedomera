import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collections, products, type CollectionId, type Product } from '../data/products'
import { useCart } from '../context/CartContext'
import { ProductModal } from '../components/ProductModal'
import { TiltCard } from '../components/TiltCard'
import { Counter } from '../components/Counter'
import { ArrowUpRight, ArrowDown, Ruler, Scale } from 'lucide-react'

export function CatalogPage() {
  const [filter, setFilter] = useState<CollectionId | 'all'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { add } = useCart()
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const list = products.filter((p) => {
    const colOk = filter === 'all' || p.collection === filter
    const q = search.trim().toLowerCase()
    const searchOk = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    return colOk && searchOk
  })

  const collectionMeta = filter === 'all'
    ? { name: 'Все коллекции', nameEn: 'Full Catalog', desc: 'Полный ассортимент стеновых панелей и реек Домэра — фактуры дерева, ткани, металла, штукатурки и 3D-декора.' }
    : { ...collections.find(c => c.id === filter)!, desc: collections.find(c => c.id === filter)!.description }

  return (
    <>
      <section className="catalog-page-hero" id="catalog">
        <div className="catalog-page-hero-bg">
          <motion.img
            src="catalog/hero/hero-wide.jpg"
            alt="Каталог Домэра"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <div className="catalog-page-veil" />
        </div>

        <div className="container catalog-page-content">
          <motion.p className="hero-eyebrow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            Домэра · {collectionMeta.nameEn}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            Каталог<br />материалов
          </motion.h1>
          <motion.p className="catalog-page-lead" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
            {collectionMeta.desc}
          </motion.p>
          <motion.div className="catalog-page-cta" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}>
            <a href="#products" className="btn btn-white interactive">
              Посмотреть артикулы <ArrowDown size={16} />
            </a>
            <a href="#showroom" className="btn btn-outline interactive" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              Записаться в шоурум
            </a>
          </motion.div>
        </div>

        <div className="catalog-page-metrics">
          <div className="container metrics-row">
            <div className="metric"><span className="metric-num"><Counter to={products.length} /></span><span className="metric-label">артикулов в наличии</span></div>
            <div className="metric"><span className="metric-num"><Counter to={collections.length} /></span><span className="metric-label">коллекций и серий</span></div>
            <div className="metric"><span className="metric-num"><Counter to={1220} suffix=" мм" /></span><span className="metric-label">ширина панели <Ruler size={12} /></span></div>
            <div className="metric"><span className="metric-num"><Counter to={13} suffix=" кг" /></span><span className="metric-label">вес панели <Scale size={12} /></span></div>
          </div>
        </div>
      </section>

      <section className="catalog-page-body" id="products">
        <div className="container">
          {/* Toolbar */}
          <div className="catalog-toolbar">
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
                  {c.name} ({products.filter(p => p.collection === c.id).length})
                </button>
              ))}
            </div>

            <div className="search-input">
              <input
                type="text"
                placeholder="Поиск: название или артикул"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <p className="catalog-count">
            Показано <strong>{list.length}</strong> из {products.length} артикулов
          </p>

          <motion.div className="grid-arch catalog-page-grid" layout>
            <AnimatePresence mode="popLayout">
              {list.map((p, i) => (
                <motion.div
                  key={p.id}
                  className="card-arch"
                  initial={{ opacity: 0, scale: 0.95, y: 100 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.8, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setSelectedProduct(p)}
                >
                  <div className="card-arch-img">
                    <TiltCard>
                      <img src={p.image} alt={p.name} loading="lazy" className="img-main" />
                      <img src={p.swatch} alt="" loading="lazy" className="img-hover" />
                    </TiltCard>
                    <div className="card-arch-tag">
                      {collections.find(c => c.id === p.collection)?.name}
                    </div>
                    <div className="card-arch-num">{(String(i + 1)).padStart(2, '0')}</div>
                    <div className="card-arch-overlay">
                      <span className="btn-view">Смотреть детали <ArrowUpRight size={14} /></span>
                      <button
                        className="btn-mini-add interactive"
                        onClick={(e) => { e.stopPropagation(); add(p) }}
                        aria-label="Добавить в заказ"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="card-arch-info">
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.sku} · {p.size}</p>
                    </div>
                    <p className="card-arch-price">{p.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {list.length === 0 && (
            <div className="catalog-empty">
              <p>По вашему запросу ничего не найдено.</p>
              <button className="btn btn-white interactive" onClick={() => { setFilter('all'); setSearch('') }}>
                Сбросить фильтры
              </button>
            </div>
          )}

          {/* CTA strip */}
          <div className="catalog-page-cta-strip">
            <div>
              <p className="eyebrow">Нужна помощь с выбором?</p>
              <h2>Подберём материалы<br />под ваш интерьер</h2>
            </div>
            <a href="#showroom" className="btn btn-primary interactive">
              Записаться в шоурум
            </a>
          </div>
        </div>
      </section>

      <ProductModal selected={selectedProduct} onSelect={setSelectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  )
}