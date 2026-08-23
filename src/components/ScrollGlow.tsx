import { useEffect, useRef } from 'react'
import { getDeviceTier } from '../lib/perf'

export function ScrollGlow() {
  const sphereRef = useRef<HTMLDivElement>(null)
  const { lowEnd, coarsePointer, reducedMotion } = getDeviceTier()

  const interactive = !lowEnd && !coarsePointer && !reducedMotion

  // Мышь → прямой DOM-трансформ через rAF: ноль ре-рендеров React
  useEffect(() => {
    if (!interactive) return
    let raf = 0
    let x = 50, y = 50

    const apply = () => {
      raf = 0
      const el = sphereRef.current
      if (el) el.style.transform = `translate(${x}vw, ${y}vh)`
    }
    const onMouseMove = (e: MouseEvent) => {
      x = (e.clientX / window.innerWidth) * 100 - 20
      y = (e.clientY / window.innerHeight) * 100 - 20
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onVisibility = () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('visibilitychange', onVisibility)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [interactive])

  return (
    <div className={`scroll-glow${lowEnd ? ' low-end' : ''}`} aria-hidden="true">
      {/* Базовый верхний градиент — статичный, дешёвый */}
      <div className="sg-base" />

      {!lowEnd && (
        <>
          <div className="sg-sphere sg-s1" />
          <div
            ref={sphereRef}
            className="sg-sphere sg-mouse"
            style={{ transform: 'translate(50vw, 50vh)' }}
          />
          <div className="sg-sphere sg-s2" />

          {/* Зерно — одна текстура вместо трёх */}
          <div className="sg-grain" />
        </>
      )}
    </div>
  )
}
