import { storefrontImageSize } from '../data/storefrontImageSizes'
import { useContext, useEffect, useState } from 'react'
import { ArrowDown, SlidersHorizontal } from 'lucide-react'
import { categoryPath, productPath, seoPages, type SeoPage } from '../data/seoRoutes'
import { collections, products, type Product } from '../data/products'
import { useCart } from '../context/CartContext'
import { InventoryContext } from '../context/inventoryState'
import { availabilityFor } from '../lib/inventory'
import { HeroTitle } from '../components/HeroTitle'
import { CatalogFacts } from '../components/CatalogFacts'
import { ProductModal } from '../components/ProductModal'
import { CatalogCard } from '../components/CatalogCard'
import { CatalogFilterControls } from '../components/CatalogFilterControls'
import { catalogResults, parseCatalogFilters, writeCatalogFilters, type CatalogFilters } from '../lib/catalogFilters'

// The generic catalog route shares its data shape with the home and article indexes.
type CatalogView = Extract<SeoPage, { kind: 'category' | 'selection' }> | (SeoPage & { kind: 'home' | 'catalog' | 'articles' })

export function CatalogPage({ page, base }: { page: CatalogView; base: string }) {
  const category = page.kind === 'category' ? page.categoryId : undefined
  const { add } = useCart()
  const stock = useContext(InventoryContext)
  const [filters, setFilters] = useState(() => parseCatalogFilters(new URLSearchParams(), category))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)

  useEffect(() => {
    const sync = () => setFilters(parseCatalogFilters(new URLSearchParams(location.search), category))
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [category])

  function changeFilters(patch: Partial<CatalogFilters>) {
    const url = new URL(location.href)
    url.search = writeCatalogFilters(url.searchParams, { ...filters, ...patch }, category).toString()
    if (url.href !== location.href) {
      if (patch.query !== undefined && Object.keys(patch).length === 1) history.replaceState(null, '', url)
      else history.pushState(null, '', url)
    }
    setFilters(parseCatalogFilters(url.searchParams, category))
  }

  const now = Date.now()
  const list = page.kind === 'selection' ? page.items :
    catalogResults(filters, id => availabilityFor(stock.inventory, id, now, stock.unavailable).status)
  const reset = () => changeFilters(parseCatalogFilters(new URLSearchParams(), category))
  const total = category ? products.filter(product => product.categoryId === category).length : products.length

  const catalogHero = 'catalog/hero/hero-catalog.webp'
  const categoryHero = category ? 'catalog/hero/collection-' + category + '.webp' : catalogHero
  const mobileHero = category
    ? ['fabric', 'profiles'].includes(category)
      ? 'catalog/categories/carousel-2026-' + category + '.webp'
      : 'catalog/hero/collection-' + category + '-mobile.webp'
    : null

  return <>
    <section className={page.kind === 'catalog' ? 'catalog-page-hero catalog-page-hero-index' : 'catalog-page-hero'} id="catalog">
      <div className="catalog-page-hero-bg">
        <picture>
          {mobileHero && <source media="(max-width: 600px)" srcSet={base + mobileHero} />}
          <img src={base + categoryHero} {...storefrontImageSize(categoryHero)} alt="" fetchPriority="high" />
        </picture>
        <div className="catalog-page-veil" />
      </div>
      <div className="container catalog-page-content">
        <p className="hero-eyebrow hero-enter-eyebrow">{page.kind === 'catalog' ? 'Декорай · Full Catalog' : 'Коллекция ДЕКОРАЙ'}</p>
        <HeroTitle lines={page.kind === 'catalog' ? ['Каталог', 'материалов'] : [page.heading]} />
        <p className="catalog-page-lead hero-enter-lead">{page.kind === 'category' ? page.intro : page.description}</p>
        <div className="catalog-page-cta hero-enter-actions">
          <a className="btn btn-white interactive" href="#products">Посмотреть материалы <ArrowDown size={16} aria-hidden="true" /></a>
          <a className="btn btn-outline interactive" href={base + 'kalkulyator/'}>Рассчитать проект</a>
        </div>
      </div>
      <CatalogFacts />
    </section>
    <section className="catalog-page-body" id="products" aria-label="Материалы и цены">
      <div className="container">
        <nav className="page-crumbs" aria-label="Хлебные крошки">
          <a href={base}>ДЕКОРАЙ</a>
          {page.kind !== 'catalog' && <a href={base + 'catalog/'}>Каталог</a>}
          <span aria-current="page">{page.heading}</span>
        </nav>
        <nav className="filters-arch catalog-route-tabs" aria-label="Категории материалов">
          {[{ path: '/catalog/', label: 'Все материалы' }, ...collections.map(item => ({
            path: categoryPath(item.id), label: item.name,
          }))].map(tab => <a key={tab.path} href={base + tab.path.slice(1)}
            aria-current={tab.path === page.path ? 'page' : undefined}>{tab.label}</a>)}
        </nav>
        {page.kind !== 'selection' && <>
          <button type="button" className="btn btn-outline catalog-mobile-filter" aria-expanded={filtersOpen}
            aria-controls="catalog-filter-panel" onClick={() => setFiltersOpen(open => !open)}>
            <SlidersHorizontal size={16} aria-hidden="true" /> {filtersOpen ? 'Скрыть фильтры' : 'Поиск и фильтры'}
          </button>
          <div id="catalog-filter-panel" className={filtersOpen ? 'catalog-filter-panel is-open' : 'catalog-filter-panel'}>
            <CatalogFilterControls filters={filters} onChange={changeFilters} reset={reset} />
          </div>
          <p className="catalog-count" role="status">Показано <strong>{list.length}</strong> из {total} позиций</p>
        </>}
        <div className="grid-arch catalog-page-grid" data-catalog-list="">
          {list.map(product => <div key={product.id} data-catalog-product={product.id}>
            <CatalogCard product={product} base={base} detailsHref={base + productPath(product).slice(1)} onDetails={setSelected} onAdd={add}
              category={collections.find(item => item.id === product.categoryId)?.name} />
          </div>)}
        </div>
        {list.length === 0 && <div className="catalog-empty">
          <p>По вашему запросу ничего не найдено.</p>
          <button className="btn btn-white interactive" onClick={reset}>Сбросить фильтры</button>
        </div>}
        {page.kind === 'catalog' && <nav className="page-links" aria-label="Подборки материалов">
          {seoPages.filter(item => item.kind === 'selection').map(item =>
            <a key={item.path} href={base + item.path.slice(1)}>{item.heading}</a>)}
        </nav>}
        {page.kind === 'selection' && <div className="page-copy">{page.copy.blocks.map(block =>
          <section key={block.heading}><h2>{block.heading}</h2><p>{block.text}</p></section>)}
          <div className="page-links">{page.copy.links?.map(link =>
            <a key={link.path} href={base + link.path.slice(1)}>{link.label}</a>)}</div>
        </div>}
        <div className="catalog-page-cta-strip">
          <h2>Подберём материалы под ваш интерьер</h2>
          <a href={base + 'showroom/'} className="btn btn-primary interactive">Контакты шоурума</a>
        </div>
      </div>
    </section>
    <ProductModal selected={selected} base={base} onSelect={setSelected} onClose={() => setSelected(null)} />
  </>
}
