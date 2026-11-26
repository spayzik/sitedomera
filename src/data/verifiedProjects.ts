import { products, type Product } from './products.ts'
import { productPath } from './seoPaths.ts'

type ReviewedProject = {
  slug: string
  title: string
  description: string
  areaM2: number
  installationDays: number
  publishedDate: string
  materialIds: readonly string[]
  cover: string
  coverCaption: string
  designBrief: string
  executionNotes: string
}

// Add only completed objects with rights to the original photo and order-confirmed SKUs.
const definitions: readonly ReviewedProject[] = []

const knownProducts = new Map(products.map(product => [product.id, product]))
const publishedProjects = definitions.map(project => {
  const materials = project.materialIds.map(id => knownProducts.get(id))
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) ||
      !/^catalog\/projects\/[a-z0-9-]+\.webp$/.test(project.cover) ||
      !Number.isFinite(project.areaM2) || project.areaM2 <= 0 ||
      !Number.isInteger(project.installationDays) || project.installationDays < 1 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(project.publishedDate) ||
      !materials.length || materials.some(product => !product || !product.sku) ||
      new Set(materials).size !== materials.length) throw new Error('Project lacks verified public facts: ' + project.slug)
  return { ...project, materials: materials as Product[] }
})

export const projectReleaseFiles = publishedProjects.map(project => project.cover)

export const projectPages = publishedProjects.map(project => ({
  kind: 'info' as const,
  path: '/proekty/' + project.slug + '/',
  title: project.title + ' — проекты ДЕКОРАЙ',
  heading: project.title,
  description: project.description,
  lastmod: project.publishedDate,
  copy: {
    image: project.cover,
    imageCaption: project.coverCaption,
    blocks: [
      { heading: 'Задача', text: project.designBrief },
      { heading: 'Площадь и сроки монтажа', text: 'Облицовано ' + project.areaM2 + ' м². Монтаж: ' + project.installationDays + ' дн.' },
      { heading: 'Как выполнена отделка', text: project.executionNotes },
    ],
    links: project.materials.map(product => ({ path: productPath(product), label: product.name + ' · ' + product.sku })),
  },
}))

export function projectRoutesForProduct(productId: string) {
  return publishedProjects.flatMap((project, index) => project.materialIds.includes(productId)
    ? [{ path: projectPages[index].path, title: project.title }] : [])
}
