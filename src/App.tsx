import { SiteLayout } from './components/SiteLayout'
import { seoPages } from './data/seoRoutes'
import { StorefrontRoute } from './pages/StorefrontRoute'
import './storefront.css'

export default function App({ base = './', path = '/' }: { base?: string; path?: string }) {
  const page = seoPages.find(item => item.path === path)
  return <SiteLayout base={base} path={path} showCommerce={page?.kind === 'product'}>
    <StorefrontRoute base={base} path={path} page={page} />
  </SiteLayout>
}
