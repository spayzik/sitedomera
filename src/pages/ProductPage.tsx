import { storefrontImageSize } from '../data/storefrontImageSizes'
import { useEffect, useState } from 'react'
import { MAX_QTY } from '../lib/cart'
import { productSalesCopy } from '../data/productSalesCopy'
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
import { ArrowUpRight, Layers, Minus, Plus, Maximize2, Truck, Wrench, Ruler } from 'lucide-react'
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

function RelatedMaterials({ items, categoryId, base }: {
  items: Product[]; categoryId: Product['categoryId']; base: string
}) {
  const { add } = useCart()
  if (!items.length) return null
  return <section className="page-related">
    <div className="detail-related-heading"><h2>Похожие материалы</h2>
      <a className="secondary-action" href={base + categoryPath(categoryId).slice(1)}>Вся коллекция <ArrowUpRight size={15} aria-hidden="true" /></a></div>
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
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const availability = useOfferAvailability(product.id)
  const category = collections.find(item => item.id === product.categoryId)!
  const context = [product.name, product.sku && product.sku !== product.name ? 'Артикул: ' + product.sku : '',
    formatDimensions(product)].filter(Boolean).join(' · ')
  const images = scenes[product.categoryId] ?? []
  const gallery = [
    { image: product.image, label: 'Образец материала' },
    ...images.map(scene => ({
      image: 'catalog/rooms/interior-' + scene + '.webp',
      label: visualizations[scene] + ' · визуализация коллекции',
    })),
  ]
  const activeImage = gallery[selectedImage] ?? gallery[0]
  const changeQuantity = (value: number) => setQuantity(Math.min(MAX_QTY, Math.max(1, value)))
  const complements = suggestedComplements(product, products)
  const hasEstimate = sheetArea(product) > 0
  const sectionLinks = [
    ['opisanie', 'Описание'], ['harakteristiki', 'Характеристики'], ['montazh', 'Монтаж'],
    ...(images.length ? [['interery', 'В интерьере']] : []),
    ...(hasEstimate ? [['raschet', 'Расчёт']] : []),
  ]
  const salesCopy = productSalesCopy(product)
  const intro = salesCopy?.[0] ?? productDescription(product)
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
    <div className="product-hero">
      <div className="product-gallery">
        {gallery.length > 1 && <div className="product-thumbnails" role="group" aria-label="Изображения материала">
          {gallery.map(({ image, label }, index) => <button key={image} type="button"
            aria-label={label} aria-pressed={index === selectedImage} onClick={() => setSelectedImage(index)}>
            <img src={base + image} {...storefrontImageSize(image)} alt="" loading="lazy" decoding="async" />
          </button>)}
        </div>}
        <figure>
          <a className="product-gallery-image" href={base + activeImage.image} aria-label={'Открыть изображение: ' + activeImage.label}>
            <img src={base + activeImage.image} {...storefrontImageSize(activeImage.image)} alt={selectedImage === 0 ? product.name + ' — образец фактуры' : activeImage.label}
              decoding="async" fetchPriority={selectedImage === 0 ? 'high' : undefined} />
            <span aria-hidden="true"><Maximize2 size={18} /></span>
          </a>
          <figcaption aria-live="polite">{activeImage.label}</figcaption>
        </figure>
      </div>
      <section className="material-purchase product-buy" aria-labelledby="product-title">
        <a className="product-category" href={base + categoryPath(category.id).slice(1)}>{category.name}</a>
        <h1 id="product-title">{product.name}</h1>
        {product.sku && <p className="commerce-card-meta">Артикул {product.sku}</p>}
        <p className="material-description">{intro}</p>
        <div className="material-price">
          <strong>{product.priceRub.toLocaleString('ru-RU')} ₽</strong><span> / {product.unit === 'шт' ? 'шт.' : product.unit}</span>
          <SheetUnitPrice product={product} />
        </div>
        <StockAvailability productId={product.id} purchase={availability === 'InStock' ? 'confirmed' : 'unconfirmed'} />
        <div className="product-quantity">
          <div role="group" aria-label="Количество">
            <button type="button" aria-label="Уменьшить количество" disabled={quantity === 1} onClick={() => changeQuantity(quantity - 1)}><Minus size={16} /></button>
            <output aria-live="polite">{quantity} {product.unit}</output>
            <button type="button" aria-label="Увеличить количество" disabled={quantity === MAX_QTY} onClick={() => changeQuantity(quantity + 1)}><Plus size={16} /></button>
          </div>
          {quantity > 1 && <strong>{(product.priceRub * quantity).toLocaleString('ru-RU')} ₽</strong>}
        </div>
        <div className="product-buy-actions">
          <button className="btn btn-primary interactive" type="button" onClick={() => add(product, quantity)}>Добавить в подборку</button>
          <LeadAction className="secondary-action" intent="samples" context={context} details={{ items: [{ id: product.id, qty: 1 }] }}><Layers size={16} aria-hidden="true" /> Запросить образец</LeadAction>
          <div>
            <LeadAction className="secondary-action" intent="consultation" context={context} details={{ items: [{ id: product.id, qty: quantity }] }}>Задать вопрос <ArrowUpRight size={15} aria-hidden="true" /></LeadAction>
            <LeadAction className="secondary-action" intent="order" context={context} details={{ items: [{ id: product.id, qty: quantity }] }}>Запросить заказ</LeadAction>
          </div>
        </div>
      </section>
    </div>
    <nav className="product-services" aria-label="Услуги">
      <a href={base + 'showroom/'}><Layers size={20} aria-hidden="true" /> Образцы в шоуруме</a>
      <a href={base + 'dostavka/'}><Truck size={20} aria-hidden="true" /> Доставка и самовывоз</a>
      <a href={base + 'montazh/'}><Wrench size={20} aria-hidden="true" /> Монтаж и замер</a>
      <a href={base + 'kalkulyator/' + (hasEstimate ? '?material=' + encodeURIComponent(product.id) : '')}><Ruler size={20} aria-hidden="true" /> Калькулятор проекта</a>
    </nav>
    <nav className="product-sections" aria-label="Разделы карточки">
      {sectionLinks.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
    </nav>
    <div className="product-content">
      <section id="opisanie" className="material-editorial product-description">
        <div>
          <h2>Описание материала</h2>
          {salesCopy ? <p>{salesCopy[1]}</p> : paragraphs.filter(Boolean).map(text => <p key={text}>{text}</p>)}
          <h3>{storyTitle}</h3><p>{story}</p>
        </div>
        <img src={base + product.image} {...storefrontImageSize(product.image)} alt={product.name + ' — фактура крупным планом'} loading="lazy" decoding="async" />
      </section>
      <section id="harakteristiki" className="product-specifications">
        <h2>Характеристики</h2>
        <dl>{productDetails(product).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section id="montazh" className="material-editorial product-installation">
        <div><h2>Применение и монтаж</h2><p>{format}</p></div>
        <a className="secondary-action" href={base + 'montazh/'}>О монтаже <ArrowUpRight size={15} aria-hidden="true" /></a>
      </section>
        {images.length > 0 && <section id="interery" className="material-scenes product-scenes" aria-label="Идеи для коллекции">
          <h2>Фактуры в интерьере</h2>
          {images.map(scene => {
            const src = base + 'catalog/rooms/interior-' + scene
            const width = scene === 'metal' ? 1448 : 1122
            return <figure key={scene}><a href={src + '.webp'} aria-label={'Открыть визуализацию: ' + visualizations[scene]}>
              <img src={src + '.webp'} srcSet={src + '-480.webp 480w, ' + src + '.webp ' + width + 'w'}
                sizes="(max-width: 44rem) 92vw, 48vw" width={width} height={scene === 'metal' ? 1086 : 1402}
                loading="lazy" decoding="async" alt={visualizations[scene]} />
            </a><figcaption>{visualizations[scene]}</figcaption></figure>
          })}
          <p>Интерьерные визуализации коллекции. Образец артикула показан отдельно.</p>
        </section>}
      {hasEstimate && <section id="raschet" className="product-calculation">
        <h2>Расчёт материалов</h2>
        <ProductEstimate product={product} calculatorBase={base} expanded />
      </section>}
      {complements.length > 0 && <section className="product-complements">
        <h2>С этим материалом выбирают</h2>
        <p>Совместимость с выбранным изделием уточнит менеджер.</p>
        <ul>{complements.map(item => <li key={item.id}>
          <a href={base + productPath(item).slice(1)}>
            <img src={base + item.swatch} {...storefrontImageSize(item.swatch)} alt="" loading="lazy" decoding="async" />
            <span>{item.name}<small>{item.priceRub.toLocaleString('ru-RU')} ₽ / {item.unit}</small></span>
          </a>
          <button type="button" className="secondary-action" aria-label={'Добавить в подборку: ' + item.name} onClick={() => add(item)}><Plus size={16} /></button>
        </li>)}</ul>
      </section>}
    </div>
    <RelatedMaterials base={base} categoryId={product.categoryId} items={relatedProducts(product, products)} />
  </div>
}
