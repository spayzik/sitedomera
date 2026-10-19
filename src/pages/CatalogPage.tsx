import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { collections, products, type CollectionId, type Product, formatDimensions, filterProducts, catalogSummary } from '../data/products'
import { useCart } from '../context/CartContext'
import { ProductModal } from '../components/ProductModal'
import { TiltCard } from '../components/TiltCard'
import { Counter } from '../components/Counter'
import { ArrowUpRight, ArrowDown, Ruler, Scale, ShoppingBag } from 'lucide-react'
import { parseCatalogHash, updateCatalogHash } from '../lib/catalogNavigation'

export function CatalogPage() {
  const reducedMotion = useReducedMotion()
  const [hash, setHash] = useState(() => window.location.hash)
  const { categoryId: filter, product: selectedProduct } = parseCatalogHash(hash)
  const { add } = useCart()
  const [search, setSearch] = useState('')
  useEffect(() => {
    const sync = () => setHash(window.location.hash)
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])
  const navigate = (patch: Parameters<typeof updateCatalogHash>[1]) => {
    const next = updateCatalogHash(window.location.hash, patch)
    if (next !== window.location.hash) history.pushState(null, '', next)
    setHash(next)
  }
  const openProduct = (p: Product | null) => navigate({ sku: p?.id ?? null })
  const setFilter = (category: CollectionId | 'all') => navigate({ category })

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const list = filterProducts(filter, search)

  const collectionMeta = filter === 'all'
    ? { name: 'Все коллекции', nameEn: 'Full Catalog', desc: 'Панели, гибкий камень, декоративные рейки и алюминиевые профили. Характеристики и цены — в карточках материалов.' }
    : { ...collections.find(c => c.id === filter)!, desc: collections.find(c => c.id === filter)!.description }

  return (
    <>
      <section className="catalog-page-hero" id="catalog">
        <div className="catalog-page-hero-bg">
          <motion.img
            src="catalog/hero/hero-catalog.webp"
            alt="Интерьер с панелями Домэра"
            fetchPriority="high"
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
            <a href="#/catalog" className="btn btn-white interactive" onClick={(event) => {
              event.preventDefault()
              document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
            }}>
              Посмотреть материалы <ArrowDown size={16} />
            </a>
            <a href="#calculator" className="btn btn-outline interactive" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              Рассчитать проект
            </a>
          </motion.div>
        </div>

        <div className="catalog-page-metrics">
          <div className="container metrics-row">
            <div className="metric"><span className="metric-num"><Counter to={products.length} /></span><span className="metric-label">позиций в каталоге</span></div>
            <div className="metric"><span className="metric-num"><Counter to={collections.length} /></span><span className="metric-label">коллекций и серий</span></div>
            <div className="metric"><span className="metric-num"><Counter to={catalogSummary.sheetWidth.max} suffix=" мм" /></span><span className="metric-label">ширина листа <Ruler size={12} /></span></div>
            <div className="metric"><span className="metric-num"><span>{catalogSummary.panelWeight.min}–</span><Counter to={catalogSummary.panelWeight.max} suffix=" кг" /></span><span className="metric-label">вес панелей <Scale size={12} /></span></div>
          </div>
        </div>
      </section>

      <section className="catalog-page-body" id="products">
        <div className="container">
          <h2 className="visually-hidden">Товары каталога</h2>
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
                  {c.name} ({products.filter(p => p.categoryId === c.id).length})
                </button>
              ))}
            </div>

            <div className="search-input">
              <input
                type="text"
                aria-label="Поиск товаров по названию или артикулу"
                placeholder="Поиск: название или артикул"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <p className="catalog-count">
            Показано <strong>{list.length}</strong> из {products.length} позиций
          </p>

          <motion.div className="grid-arch catalog-page-grid" layout={!reducedMotion}>
            <AnimatePresence mode="popLayout">
              {list.map((p, i) => (
                <motion.div
                  key={p.id}
                  className={`card-arch${p.kind === 'profile' ? ' is-profile' : ''}`}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 60 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => openProduct(p)}
                >
                  <div className="card-arch-img">
                    <TiltCard>
                      <img src={p.image} alt={p.name} loading="lazy" className="img-main" />
                      <img src={p.swatch} alt="" loading="lazy" className="img-hover" />
                    </TiltCard>
                    <div className="card-arch-tag">
                      {collections.find(c => c.id === p.categoryId)?.name}
                    </div>
                    <div className="card-arch-num">{(String(i + 1)).padStart(2, '0')}</div>
                    <div className="card-arch-overlay">
                      <button className="btn-view" aria-label={`Подробнее: ${p.name}`} onClick={(e) => { e.stopPropagation(); openProduct(p) }}>Смотреть детали <ArrowUpRight size={14} /></button>
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
              Контакты шоурума
            </a>
          </div>
        </div>
      </section>

      <ProductModal selected={selectedProduct} onSelect={openProduct} onClose={() => openProduct(null)} />
    </>
  )
}
