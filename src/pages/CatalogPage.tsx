import { categoryPath } from '../data/seoPaths'
import { LeadAction } from '../components/LeadProvider'
import { useContext, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { collections, products, type CollectionId, type Product, catalogSummary } from '../data/products'
import { useCart } from '../context/CartContext'
import { ProductModal } from '../components/ProductModal'
import { CatalogCard } from '../components/CatalogCard'
import { Counter } from '../components/Counter'
import { ArrowDown, Ruler, Scale } from 'lucide-react'
import { parseCatalogHash, updateCatalogHash } from '../lib/catalogNavigation'
import { availabilityFor } from '../lib/inventory'
import { InventoryContext } from '../context/inventoryState'
import { CatalogFilterControls } from '../components/CatalogFilterControls'
import { catalogResults, parseCatalogFilters, writeCatalogFilters, type CatalogFilters } from '../lib/catalogFilters'

export function CatalogPage() {
  const reducedMotion = useReducedMotion()
  const [hash, setHash] = useState(() => window.location.hash)
  const { categoryId: filter, product: selectedProduct } = parseCatalogHash(hash)
  const { add } = useCart()
  const stock = useContext(InventoryContext)
  const params = new URLSearchParams(hash.split('?')[1])
  const filters = parseCatalogFilters(params)
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
  const changeFilters = (patch: Partial<CatalogFilters>) => {
    const params = new URLSearchParams(window.location.hash.split('?')[1])
    const filters = parseCatalogFilters(params)
    const query = writeCatalogFilters(params, { ...filters, ...patch }).toString()
    const next = '#/catalog' + (query ? '?' + query : '')
    if (next !== window.location.hash) {
      if (patch.query !== undefined && Object.keys(patch).length === 1) history.replaceState(null, '', next)
      else history.pushState(null, '', next)
    }
    setHash(next)
  }
  const setFilter = (category: CollectionId | 'all') => changeFilters({ category, thickness: '' })
  const reset = () => changeFilters(parseCatalogFilters(new URLSearchParams()))

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const now = Date.now()
  const list = catalogResults(filters, id => availabilityFor(stock.inventory, id, now, stock.unavailable).status)

  const collectionMeta = filter === 'all'
    ? { name: 'Все коллекции', nameEn: 'Full Catalog', desc: 'Панели, гибкий камень, декоративные рейки и алюминиевые профили. Характеристики и цены — в карточках материалов.' }
    : { ...collections.find(c => c.id === filter)!, desc: collections.find(c => c.id === filter)!.description }

  return (
    <>
      <section className="catalog-page-hero" id="catalog">
        <div className="catalog-page-hero-bg">
          <motion.img
            src="catalog/hero/hero-catalog.webp"
            alt="Интерьер с панелями ДЕКОРАЙ"
            fetchPriority="high"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <div className="catalog-page-veil" />
        </div>

        <div className="container catalog-page-content">
          <motion.p className="hero-eyebrow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            Декорай · {collectionMeta.nameEn}
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
              document.getElementById('products')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' })
            }}>
              Посмотреть материалы <ArrowDown size={16} />
            </a>
            <a href={import.meta.env.BASE_URL + 'kalkulyator/'} className="btn btn-outline interactive" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              Рассчитать проект
            </a>
            <a className="btn btn-outline interactive" href={import.meta.env.BASE_URL + (filter === 'all' ? 'catalog/' : categoryPath(filter).slice(1))}>Страница каталога</a>
            <LeadAction intent="consultation" className="btn btn-outline interactive">Оставить заявку</LeadAction>
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
              <button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                Все ({products.length})
              </button>
              {collections.map((c) => (
                <button
                  key={c.id}
                  className={filter === c.id ? 'active' : ''}
                  aria-pressed={filter === c.id}
                  onClick={() => setFilter(c.id)}
                >
                  {c.name} ({c.count})
                </button>
              ))}
            </div>


          </div>

          <CatalogFilterControls filters={filters} onChange={changeFilters} reset={reset} />
          <p className="catalog-count" role="status">
            Показано <strong>{list.length}</strong> из {products.length} позиций
          </p>

          <div className="grid-arch catalog-page-grid">
            {list.map(p => (
              <CatalogCard key={p.id} product={p} onDetails={openProduct} onAdd={add}
                category={filter === 'all' ? collections.find(c => c.id === p.categoryId)?.name : undefined} />
            ))}
          </div>

          {list.length === 0 && (
            <div className="catalog-empty">
              <p>По вашему запросу ничего не найдено.</p>
              <button className="btn btn-white interactive" onClick={reset}>
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
            <a href={import.meta.env.BASE_URL + 'showroom/'} className="btn btn-primary interactive">
              Контакты шоурума
            </a>
          </div>
        </div>
      </section>

      <ProductModal selected={selectedProduct} onSelect={openProduct} onClose={() => openProduct(null)} />
    </>
  )
}
