import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { products, collections, type CollectionId } from '../data/products'
import { useCart } from '../context/CartContext'
import { ChevronRight } from 'lucide-react'

export function TryOn() {
  const [selected, setSelected] = useState(products[0].id)
  const [colFilter, setColFilter] = useState<CollectionId | 'all'>('all')
  const { add } = useCart()

  const product = useMemo(
    () => products.find((p) => p.id === selected) ?? products[0],
    [selected],
  )

  const list = useMemo(
    () => (colFilter === 'all' ? products : products.filter((p) => p.collection === colFilter)),
    [colFilter],
  )

  const pickChip = (id: CollectionId | 'all') => {
    setColFilter(id)
    const first = id === 'all' ? products[0] : products.find((p) => p.collection === id)
    if (first) setSelected(first.id)
  }

  const collectionName = collections.find((c) => c.id === product.collection)?.name

  return (
    <section className="section tryon" id="tryon">
      <div className="container">
        <div className="catalog-header" style={{ marginBottom: '3rem' }}>
          <div>
            <p className="eyebrow">Материалы</p>
            <h2>Студия<br/>текстур</h2>
          </div>
          <p className="lead">
            Детальное отображение фактуры с имитацией студийного освещения. 
            Почувствуйте объем и качество материалов Домэра.
          </p>
        </div>

        <div className="split-grid" style={{ gap: '3rem', alignItems: 'start' }}>
          {/* Studio Scene */}
          <motion.div
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              backgroundColor: '#111',
              aspectRatio: '16/9',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--line)'
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Base scene stays visible; the selected material is applied only to the wall. */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/catalog/rooms/tryon-base-2.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              pointerEvents: 'none',
            }} />
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
              style={{
                position: 'absolute',
                left: '12%',
                top: '14%',
                width: '60%',
                height: '70%',
                backgroundImage: `url(${product.swatch})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: 'inset 0 0 35px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            />
            <div style={{
              position: 'absolute',
              left: '12%',
              top: '14%',
              width: '60%',
              height: '70%',
              background: 'linear-gradient(115deg, rgba(255,255,255,0.18), transparent 32%, rgba(0,0,0,0.2))',
              pointerEvents: 'none',
            }} />
            
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '1.5rem',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              padding: '0.75rem 1.25rem',
              borderRadius: '100px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
              Студийный свет
            </div>
          </motion.div>

          {/* Selection Panel */}
          <motion.div
            className="specs-card glass-dark"
            style={{ display: 'flex', flexDirection: 'column', padding: '2.5rem', background: 'rgba(255,255,255,0.03)' }}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)', marginBottom: '0.35rem' }}>
                Все текстуры
              </h3>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                {colFilter === 'all' ? 'Все артикулы' : collectionName} · {list.length} артикулов
              </p>
            </div>

            <div className="tryon-chips">
              <button
                type="button"
                className={`tryon-chip ${colFilter === 'all' ? 'active' : ''}`}
                onClick={() => pickChip('all')}
              >
                Все
              </button>
              {collections.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`tryon-chip ${colFilter === c.id ? 'active' : ''}`}
                  onClick={() => pickChip(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              overflowY: 'auto',
              maxHeight: '400px',
              paddingRight: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              {list.map((p) => {
                const isSelected = selected === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className="interactive"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                      background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                      textAlign: 'left',
                      transition: 'background 0.2s, border 0.2s',
                    }}
                  >
                    <img
                      src={p.swatch}
                      alt={p.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      loading="lazy"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{
                        display: 'block',
                        fontSize: '0.9rem',
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: isSelected ? 600 : 400
                      }}>
                        {p.name}
                      </strong>
                      <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{p.sku}</span>
                    </div>
                    {isSelected && (
                      <ChevronRight size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{
              borderTop: '1px solid var(--line)',
              paddingTop: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {product.price.toLocaleString('ru-RU')} ₽
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  / {product.unit || 'шт'}
                </span>
              </div>
              <button
                className="btn btn-primary interactive"
                onClick={() => add(product)}
              >
                [ ДОБАВИТЬ ]
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
