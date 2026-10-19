import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { categoryPresentation } from '../lib/categoryPresentation'

export function CategoriesTeaser() {
  const track = useRef<HTMLDivElement>(null)
  const gesture = useRef({ x: 0, y: 0, moved: false })
  const [active, setActive] = useState<string | null>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const reducedMotion = useReducedMotion()
  const updateEdges = useCallback(() => {
    const node = track.current
    if (!node) return
    const start = node.scrollLeft < 2
    const end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2
    setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end })
  }, [])
  useEffect(() => {
    const node = track.current
    if (!node) return
    const observer = new ResizeObserver(updateEdges)
    observer.observe(node)
    return () => observer.disconnect()
  }, [updateEdges])
  const move = (direction: number) => track.current?.scrollBy({
    left: direction * track.current.clientWidth * 0.7,
    behavior: reducedMotion ? 'instant' : 'smooth',
  })

  return (
    <section className="cat-teaser catalog-categories" aria-labelledby="category-heading">
      <div className="container cat-heading">
        <div><p className="eyebrow">Материалы для вашего пространства</p><h2 id="category-heading">Фактуры и формы</h2></div>
        <div className="cat-navigation" aria-label="Прокрутка категорий">
          <span>{categoryPresentation.length} коллекций · листайте</span>
          <button type="button" aria-label="Предыдущие категории" disabled={edges.start} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
          <button type="button" aria-label="Следующие категории" disabled={edges.end} onClick={() => move(1)}><ArrowRight size={18} /></button>
        </div>
      </div>
      <div className="cat-track" ref={track} onScroll={updateEdges} onMouseLeave={() => setActive(null)} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
      }}>
        {categoryPresentation.map(category => (
          <a key={category.id} href={category.href}
            aria-label={`Открыть категорию: ${category.name}`}
            className={`cat-panel${active === category.id ? ' is-active' : ''}`}
            onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(category.id) }}
            onFocus={() => setActive(category.id)}
            onTransitionEnd={event => {
              if (event.propertyName === 'flex-basis' && event.currentTarget === document.activeElement)
                event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
              updateEdges()
            }}
            onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY, moved: false } }}
            onPointerMove={event => {
              if (event.buttons && Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y) > 10) gesture.current.moved = true
            }}
            onPointerCancel={() => { gesture.current.moved = true }}
            onClick={event => { if (gesture.current.moved && event.detail !== 0) { event.preventDefault(); gesture.current.moved = false } }}>
            <img className="cat-panel-img" src={category.image} alt="" loading="lazy" decoding="async"
              style={{ objectPosition: category.imagePosition }} />
            <div className="cat-panel-shade" />
            <div className="cat-panel-content">
              <p className="cat-panel-count">Позиций: {category.count}</p>
              <h3 className="cat-panel-title">{category.name}</h3>
              <div className="cat-card-text"><div className="cat-card-text-inner"><p className="cat-card-copy">{category.copy}</p></div></div>
              <span className="cat-panel-link">Смотреть коллекцию <ArrowUpRight size={16} /></span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
