import { storefrontImageSize } from '../data/storefrontImageSizes'
import { ArrowUpRight, Plus } from 'lucide-react'
import { useStockAvailability } from '../context/inventoryState'
import { formatDimensions, type Product } from '../data/products'
import { sheetArea } from '../lib/calculator'
import { LeadAction } from './LeadProvider'
import { SheetUnitPrice } from './SheetUnitPrice'
import { StockAvailability } from './StockAvailability'
import './CatalogCard.css'

interface CatalogCardProps {
  product: Product
  category?: string
  base?: string
  detailsHref?: string
  onDetails?: (product: Product) => void
  onAdd?: (product: Product) => void
}

export function CatalogCard({ product, category, base = "./", detailsHref, onDetails, onAdd }: CatalogCardProps) {
  const titleId = "material-" + product.id
  const stock = useStockAvailability(product.id)
  const sku = product.sku && product.sku !== product.name ? product.sku : null
  const dimensions = formatDimensions(product)
  const imageSize = storefrontImageSize(product.image)
  const compactSource = product.kind !== 'profile' && imageSize.width !== undefined && imageSize.width < 300
  const canCalculate = sheetArea(product) > 0 && stock.status !== 'out_of_stock'
  const inquiry = stock.status === 'out_of_stock' ? 'Уточнить поставку' : 'Уточнить наличие'

  const sample = <>
    <img className={compactSource ? "material-sample-lowres" : undefined} src={base + product.image} alt="" loading="lazy" decoding="async" {...imageSize} />
    {category && <span className="commerce-card-category">{category}</span>}
    <span className="commerce-card-open" aria-hidden="true">Смотреть детали <ArrowUpRight size={15} /></span>
  </>

  return (
    <article className={`card-arch commerce-card${product.kind === "profile" ? " is-profile" : ""}`} aria-labelledby={titleId}>
      {detailsHref ? <a className="card-arch-img commerce-card-sample interactive" href={detailsHref}
        aria-label={`Подробнее: ${product.name}`} aria-haspopup={onDetails ? 'dialog' : undefined}
        onClick={event => {
          if (!onDetails || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onDetails(product)
        }}>{sample}</a>
        : <button type="button" className="card-arch-img commerce-card-sample interactive"
          aria-label={`Подробнее: ${product.name}`} aria-haspopup="dialog" onClick={() => onDetails?.(product)}>{sample}</button>}
      <div className="commerce-card-body">
        <div>
          <h3 id={titleId}>{detailsHref && onDetails ? <a href={detailsHref}>{product.name}</a> : product.name}</h3>
          <p className="commerce-card-meta">{sku && <span>Артикул {sku}</span>}<span>{dimensions}</span></p>
          <div className="commerce-card-pricing">
            <div className="commerce-card-costs">
              <p className="commerce-card-price">{product.priceRub.toLocaleString('ru-RU')} ₽
                <span> / {product.unit === 'шт' ? 'шт.' : product.unit}</span>
              </p>
              <SheetUnitPrice product={product} />
            </div>
            <StockAvailability productId={product.id} />
          </div>
        </div>
        <div className="commerce-card-actions">
          {onAdd && <button type="button" className="commerce-card-add interactive" onClick={() => onAdd?.(product)}
            aria-label={detailsHref ? `В подборку: ${product.name}` : "Добавить в подборку"}><Plus size={16} aria-hidden="true" /> В подборку</button>}
          {canCalculate ? (
            <a className="commerce-card-secondary interactive"
              href={base + 'kalkulyator/?material=' + encodeURIComponent(product.id)}>Рассчитать</a>
          ) : stock.status !== 'in_stock' && (
            <LeadAction className="commerce-card-secondary interactive" intent="consultation"
              context={`${product.name}${sku ? ' · Артикул ' + sku : ''} · ${dimensions}`}>{inquiry}</LeadAction>
          )}
        </div>
      </div>
    </article>
  )
}
