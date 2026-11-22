import { storefrontImageSize } from '../data/storefrontImageSizes'
import { useEffect } from 'react'
import { collections, formatDimensions, productDetails, products, type Product } from '../data/products'
import { categoryPath, productPath } from '../data/seoPaths'
import { useCart } from '../context/CartContext'
import { useStockAvailability } from '../context/inventoryState'
import { CatalogCard } from '../components/CatalogCard'
import { LeadAction } from '../components/LeadProvider'
import { ProductEstimate } from '../components/ProductEstimate'
import { SheetUnitPrice } from '../components/SheetUnitPrice'
import { StockAvailability } from '../components/StockAvailability'
import { sheetArea } from '../lib/calculator'
import { ArrowUpRight, Calculator as CalculatorIcon, Layers } from 'lucide-react'
import { productDescription, productEditorialNote, relatedProducts, suggestedComplements } from '../lib/productPresentation'

const visualizations = {
  bedroom: 'Акцентная стена в спальне',
  dining: 'Отделка обеденной зоны',
  living: 'Рейки в гостиной',
  metal: 'Металлическая фактура с подсветкой',
  fabric: 'Тканевая фактура в гостиной',
}
const scenes: Partial<Record<Product['categoryId'], (keyof typeof visualizations)[]>> = {
  wood: ['bedroom', 'dining'], slats: ['living', 'bedroom'], fabric: ['fabric'], metal: ['metal'],
}

function RelatedMaterials({ items, heading, base, note }: {
  items: Product[]; heading: string; base: string; note?: string
}) {
  const { add } = useCart()
  if (!items.length) return null
  return <section className="page-related">
    <h2>{heading}</h2>{note && <p>{note}</p>}
    <div className="grid-arch catalog-page-grid">{items.map(product =>
      <CatalogCard key={product.id} product={product} base={base} onAdd={add}
        detailsHref={base + productPath(product).slice(1)} />)}</div>
  </section>
}

export function ProductPage({ product, base }: { product: Product; base: string }) {
  const { add } = useCart()
  const availability = useStockAvailability(product.id)
  const category = collections.find(item => item.id === product.categoryId)!
  const context = [product.name, product.sku && product.sku !== product.name ? 'Артикул: ' + product.sku : '',
    formatDimensions(product)].filter(Boolean).join(' · ')
  const images = scenes[product.categoryId] ?? []

  useEffect(() => {
    const data = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
    if (!data?.textContent) return
    const schema = JSON.parse(data.textContent)
    const offer = schema['@graph']?.find((node: { '@type': string }) => node['@type'] === 'Product')?.offers
    if (!offer) return
    if (availability.status === 'unknown') delete offer.availability
    else offer.availability = availability.status === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    data.textContent = JSON.stringify(schema)
  }, [availability.status])

  return <div className="container page-section product-page">
    <nav className="page-crumbs" aria-label="Хлебные крошки">
      <a href={base}>ДЕКОРАЙ</a><a href={base + 'catalog/'}>Каталог</a>
      <a href={base + categoryPath(category.id).slice(1)}>{category.name}</a><span aria-current="page">{product.name}</span>
    </nav>
    <div className="material-layout">
      <div className="material-gallery">
        <figure className="seo-material">
          <a className="material-sample" href={base + product.image} aria-label={'Открыть образец: ' + product.name}>
            <img src={base + product.image} alt={product.name + ' — образец фактуры'} decoding="async" fetchPriority="high" {...storefrontImageSize(product.image)} />
          </a>
          <figcaption>Образец материала</figcaption>
        </figure>
        {images.length > 0 && <aside className="material-scenes" aria-label="Идеи для коллекции">
          {images.map(scene => {
            const src = base + 'catalog/rooms/interior-' + scene
            const width = scene === 'metal' ? 1448 : 1122
            return <figure key={scene}><a href={src + '.webp'} aria-label={'Открыть визуализацию: ' + visualizations[scene]}>
              <img src={src + '.webp'} srcSet={src + '-480.webp 480w, ' + src + '.webp ' + width + 'w'}
                sizes="(max-width: 44rem) 44vw, 320px" width={width} height={scene === 'metal' ? 1086 : 1402}
                loading="lazy" decoding="async" alt={visualizations[scene]} />
            </a><figcaption>{visualizations[scene]}</figcaption></figure>
          })}
          <p>Интерьерные визуализации коллекции. Образец артикула показан отдельно.</p>
        </aside>}
      </div>
      <section className="material-purchase">
        <p className="eyebrow">{category.name}</p>
        <h1>{product.name}</h1>
        {product.sku && product.sku !== product.name && <p className="commerce-card-meta">Артикул {product.sku}</p>}
        <p className="material-description">{productDescription(product)}</p>
        <div className="material-price">
          <strong>{product.priceRub.toLocaleString('ru-RU')} ₽</strong><span> / {product.unit === 'шт' ? 'шт.' : product.unit}</span>
          <SheetUnitPrice product={product} />
        </div>
        <StockAvailability productId={product.id} />
        <div className="page-links material-actions">
          <button className="btn btn-primary interactive" type="button" onClick={() => add(product)}>Добавить в подборку</button>
          <LeadAction className="secondary-action" intent="consultation" context={context}>Задать вопрос <ArrowUpRight size={15} aria-hidden="true" /></LeadAction>
        </div>
        <div className="page-links">
          <LeadAction className="secondary-action" intent="samples" context={context}><Layers size={15} aria-hidden="true" /> Запросить образец</LeadAction>
          {sheetArea(product) > 0 && <a className="secondary-action" href={base + 'kalkulyator/?material=' + encodeURIComponent(product.id)}><CalculatorIcon size={15} aria-hidden="true" /> Рассчитать для моей стены</a>}
        </div>
        <div className="material-specs"><h2>Характеристики</h2>
        <dl>{productDetails(product).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></div>
        {sheetArea(product) > 0 && <ProductEstimate product={product} calculatorBase={base} />}
      </section>
    </div>
    <section className="material-editorial"><h2>Как выбрать и примерить материал</h2><p>{productEditorialNote(product)}</p></section>
    <RelatedMaterials base={base} heading="Похожие материалы" items={relatedProducts(product, products)} />
    <RelatedMaterials base={base} heading="Сопутствующие материалы" items={suggestedComplements(product, products)}
      note="Совместимость с выбранным изделием уточнит менеджер." />
  </div>
}
