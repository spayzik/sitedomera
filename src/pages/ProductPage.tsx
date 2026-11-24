import { storefrontImageSize } from '../data/storefrontImageSizes'
import { useEffect } from 'react'
import { collections, formatDimensions, productDetails, products, type Product } from '../data/products'
import { categoryPath, productPath } from '../data/seoPaths'
import { useCart } from '../context/CartContext'
import { useOfferAvailability } from '../context/inventoryState'
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

const materialStories = {
  "wood": [
    "Древесный рисунок и направление",
    "Рисунок древесины заметнее, когда несколько листов стоят рядом. Вертикальное направление может подчеркнуть высоту, горизонтальное — ширину участка. Положите образец рядом с полом и фасадами: оттенки и масштаб рисунка лучше оценивать в одном свете."
  ],
  "fabric": [
    "Тканевый рисунок и свет",
    "Фактуру проще оценить на двух расстояниях. Вблизи видны переплетение и рельеф рисунка, от входа в комнату — общий тон стены. Если рядом будет обивка, приложите к ней образец вертикально: лежащая на столе панель отражает свет иначе."
  ],
  "metal": [
    "Как работает боковой свет",
    "Металлическую фактуру стоит рассмотреть под тем углом, с которого вы чаще всего будете видеть стену. Для зоны с подсветкой примерьте образец рядом со светильником и фурнитурой. Если рисунок выглядит слишком активно, попробуйте оставить его на одном участке."
  ],
  "bamboo_stone": [
    "Рисунок на большой плоскости",
    "На небольшом образце проще сравнить цвет, на широкой стене важен масштаб рисунка. Решите, какие участки будут видны рядом с дверью или мебелью, и проверьте, как линия стыка пройдёт относительно заметных деталей."
  ],
  "soft": [
    "Оттенок рядом с мебелью",
    "У спокойной однотонной отделки особенно заметны переходы между соседними цветами. Примерьте образец у пола и у фасада, затем отойдите на несколько шагов. Оцените, подходит ли тон при дневном свете и вечером с включёнными светильниками."
  ],
  "flexible_stone": [
    "Плоскости, края и изгибы",
    "На плоской стене сначала оцените рисунок и вид стыков. Если проект включает нишу, откос или изогнутый участок, покажите его на фото и укажите размеры. Допустимый изгиб и способ крепления уточняют для конкретного артикула."
  ],
  "plaster": [
    "Рисунок штукатурки при разном свете",
    "При боковом освещении рельефный рисунок может читаться иначе, чем при рассеянном. Сравните образец с краской, полом и соседними плоскостями. Для акцентного участка посмотрите, как фактура выглядит с уровня глаз и при вечерней подсветке."
  ],
  "slats": [
    "Ритм и границы ряда",
    "Рейки воспринимаются прежде всего как повторяющийся рисунок. На эскизе отметьте начало и конец ряда, углы и места пересечения с мебелью. Примерьте образец рядом с фоном и посмотрите, нужна ли заметная граница между материалами."
  ],
  "profiles": [
    "Как будет выглядеть стык",
    "Профиль выбирают по задаче: соединить панели, закрыть край или оформить угол. Посмотрите образец рядом с самой панелью и фурнитурой, затем отметьте на плане видимые линии. Форма и отделка профиля влияют на то, будет ли стык заметным."
  ]
} as const

export function ProductPage({ product, base }: { product: Product; base: string }) {
  const { add } = useCart()
  const availability = useOfferAvailability(product.id)
  const category = collections.find(item => item.id === product.categoryId)!
  const context = [product.name, product.sku && product.sku !== product.name ? 'Артикул: ' + product.sku : '',
    formatDimensions(product)].filter(Boolean).join(' · ')
  const images = scenes[product.categoryId] ?? []
  const intro = product.sku === '671-A227'
    ? 'Белая панель с рисунком рогожки. Светлый тканевый рисунок можно использовать как фон для мебели или выделить им стену за изголовьем.'
    : productDescription(product)
  const format = product.kind === 'profile'
    ? 'Сверьте длину видимого стыка и толщину облицовки. Для открытой кромки, стыка и угла нужны разные формы профиля.'
    : product.kind === 'slat'
      ? 'Наметьте границы отделки и направление реек. Перед подсчётом количества согласуйте шаг и оформление крайней рейки.'
      : 'На эскизе отметьте границы отделки, проёмы и розетки. Сравните размеры стены с форматом листа, чтобы заранее увидеть, где будут стыки и подрезка.'
  const [storyTitle, story] = materialStories[product.categoryId]
  const editorial = productEditorialNote(product)
  const split = editorial.indexOf('. ', 70)
  const paragraphs = split > 0 ? [editorial.slice(0, split + 1), editorial.slice(split + 2)] : [editorial]

  useEffect(() => {
    const data = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
    if (!data?.textContent) return
    const schema = JSON.parse(data.textContent)
    const offer = schema['@graph']?.find((node: { '@type': string }) => node['@type'] === 'Product')?.offers
    if (!offer) return
    if (!availability) delete offer.availability
    else offer.availability = 'https://schema.org/' + availability
    data.textContent = JSON.stringify(schema)
  }, [availability])

  return <div className="container page-section product-page" data-analytics-product={product.id} data-analytics-price={product.priceRub}>
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
        <section className="material-editorial">
          <h2>О материале</h2>
          <dl className="material-overview"><div><dt>Формат</dt><dd>{formatDimensions(product)}</dd></div><div><dt>Продажа</dt><dd>{product.unit === 'шт' ? 'Поштучно' : product.unit === 'лист' ? 'За лист' : product.unit}</dd></div></dl>
          <h3>{product.kind === 'profile' ? 'Как подобрать профиль' : 'Как выглядит в интерьере'}</h3>
          {paragraphs.filter(Boolean).map(text => <p key={text}>{text}</p>)}
          <h3>{storyTitle}</h3><p>{story}</p>
          <h3>Перед заказом</h3>
          <p>{format}</p>
        </section>
        {images.length > 0 && <aside className="material-scenes" aria-label="Идеи для коллекции">
          <h2>Фактуры в интерьере</h2>
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
        <p className="material-description">{intro}</p>
        <div className="material-price">
          <strong>{product.priceRub.toLocaleString('ru-RU')} ₽</strong><span> / {product.unit === 'шт' ? 'шт.' : product.unit}</span>
          <SheetUnitPrice product={product} />
        </div>
        <StockAvailability productId={product.id} purchase={availability === 'InStock' ? 'confirmed' : 'unconfirmed'} />
        <div className="page-links material-actions">
          <button className="btn btn-primary interactive" type="button" onClick={() => add(product)}>Добавить в подборку</button>
          <LeadAction className="secondary-action" intent="consultation" context={context} details={{ items: [{ id: product.id, qty: 1 }] }}>Задать вопрос <ArrowUpRight size={15} aria-hidden="true" /></LeadAction>
          <LeadAction className="secondary-action" intent="samples" context={context} details={{ items: [{ id: product.id, qty: 1 }] }}><Layers size={15} aria-hidden="true" /> Запросить образец</LeadAction>
          <LeadAction className="secondary-action" intent="order" context={context} details={{ items: [{ id: product.id, qty: 1 }] }}>Запросить заказ</LeadAction>
          {sheetArea(product) > 0 && <a className="secondary-action" href={base + 'kalkulyator/?material=' + encodeURIComponent(product.id)}><CalculatorIcon size={15} aria-hidden="true" /> Рассчитать для моей стены</a>}
        </div>
        <div className="material-specs"><h2>Характеристики</h2>
        <dl>{productDetails(product).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></div>
        {sheetArea(product) > 0 && <ProductEstimate product={product} calculatorBase={base} />}
      </section>
    </div>
    <RelatedMaterials base={base} heading="Похожие материалы" items={relatedProducts(product, products)} />
    <RelatedMaterials base={base} heading="Сопутствующие материалы" items={suggestedComplements(product, products)}
      note="Совместимость с выбранным изделием уточнит менеджер." />
  </div>
}
