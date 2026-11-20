import { useState } from 'react'
import { collections, products, type CollectionId, type Product } from '../data/products'
import { useCart } from '../context/CartContext'
import { ProductModal } from './ProductModal'
import { CatalogCard } from './CatalogCard'
import { ArrowUpRight } from 'lucide-react'

const FEATURED = collections.slice(0, 6).map(c => products.find(p => p.categoryId === c.id)!.id)

export function Catalog() {
  const [filter, setFilter] = useState<CollectionId | 'all'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { add } = useCart()

  const list = filter === 'all' ? products : products.filter((p) => p.categoryId === filter)
  const preview = filter === 'all' ? FEATURED.map(id => products.find(p => p.id === id)!).filter(Boolean) : list

  return (
    <>
      <section className="section catalog" id="catalog">
        <div className="container">
          <div className="catalog-header">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2>Коллекция<br/>материалов</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'flex-start' }}>
              <p className="lead">
                {products.length} позиций: панели, гибкий камень, рейки и профили.
                Выберите фактуру для детального изучения.
              </p>
              <a href="#/catalog" className="btn btn-white interactive">
                Открыть полный каталог <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

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
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid-arch">
            {preview.slice(0, 9).map(p => (
              <CatalogCard key={p.id} product={p} onDetails={setSelectedProduct} onAdd={add}
                category={filter === 'all' ? collections.find(c => c.id === p.categoryId)?.name : undefined} />
            ))}
          </div>

          <div className="catalog-more">
            <a href="#/catalog" className="btn btn-primary interactive">
              Смотреть все {products.length} позиций
            </a>
          </div>
        </div>
      </section>

      <ProductModal selected={selectedProduct} onSelect={setSelectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  )
}
