import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
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
  const keepPanelVisible = (panel: HTMLElement) => {
    const node = track.current
    if (!node) return
    const bounds = node.getBoundingClientRect()
    const item = panel.getBoundingClientRect()
    const delta = item.right > bounds.right ? item.right - bounds.right
      : item.left < bounds.left ? item.left - bounds.left : 0
    if (delta) node.scrollBy({ left: delta, behavior: 'instant' })
  }
  useEffect(() => {
    if (reducedMotion && active) {
      const panel = track.current?.querySelector<HTMLElement>('.is-active')
      if (panel) keepPanelVisible(panel)
    }
  }, [active, reducedMotion])
  const move = (direction: number) => track.current?.scrollBy({
    left: direction * track.current.clientWidth * 0.7,
    behavior: reducedMotion ? 'instant' : 'smooth',
  })

  return (
    <section className="cat-teaser catalog-categories" aria-labelledby="category-heading">
      <h2 id="category-heading" className="visually-hidden">Категории материалов</h2>
      <div className="cat-navigation" aria-label="Прокрутка категорий">
          <button type="button" aria-label="Предыдущие категории" disabled={edges.start} onClick={() => move(-1)}><ArrowLeft size={18} /></button>
          <button type="button" aria-label="Следующие категории" disabled={edges.end} onClick={() => move(1)}><ArrowRight size={18} /></button>
      </div>
      <div className="cat-track" ref={track} onScroll={updateEdges} onMouseLeave={() => setActive(null)} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
      }}>
        {categoryPresentation.map(category => (
          <a key={category.id} href={category.href}
            aria-label={`Открыть категорию: ${category.name}`}
            className={`cat-panel${category.id === 'profiles' ? ' is-profile' : ''}${active === category.id ? ' is-active' : ''}`}
            onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(category.id) }}
            onFocus={() => setActive(category.id)}
            onTransitionEnd={event => {
              if (event.propertyName === 'flex-basis' && (active === category.id || event.currentTarget === document.activeElement))
                keepPanelVisible(event.currentTarget)
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
              <h3 className="cat-panel-title">{category.name}</h3>
              <div className="cat-card-text"><div className="cat-card-text-inner">
                <p className="cat-card-copy">{category.shortDescription}</p>
              </div></div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
