import { createRoot } from 'react-dom/client'
import { Reviews } from './components/Reviews'

const reviews = document.querySelector<HTMLElement>('[data-seo-reviews]')
if (reviews) createRoot(reviews).render(<Reviews assetBase={reviews.dataset.assetBase} />)
