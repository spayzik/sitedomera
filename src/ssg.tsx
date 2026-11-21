import { renderToString, renderToStaticMarkup } from 'react-dom/server'
import { CatalogCard } from './components/CatalogCard'
import { SiteLayout } from './components/SiteLayout'
import { collections } from './data/products'

export const renderShell = (props: Parameters<typeof SiteLayout>[0]) => renderToString(<SiteLayout {...props} />)

export function renderCard(props: Parameters<typeof CatalogCard>[0]) {
  return renderToStaticMarkup(<CatalogCard {...props}
    category={collections.find(collection => collection.id === props.product.categoryId)?.name} />)
}
