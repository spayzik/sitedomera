import { useEffect, useRef } from 'react'
import { getDeviceTier } from '../lib/perf'

export function ScrollGlow() {
  const sphereRef = useRef<HTMLDivElement>(null)
  const { lowEnd, coarsePointer, reducedMotion } = getDeviceTier()

  // На телефонах и слабых ПК оставляем только статичные градиенты.
  // Blur-анимации нужны лишь для мощных устройств с точным курсором.
  const enhanced = !lowEnd && !coarsePointer && !reducedMotion

  // Мышь → прямой DOM-трансформ через rAF: ноль ре-рендеров React
  useEffect(() => {
    if (!enhanced) return
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
  }, [enhanced])

  return (
    <div className={`scroll-glow${enhanced ? ' enhanced' : ''}`} aria-hidden="true">
      {/* Оба слоя статичны на слабых устройствах и телефонах. */}
      <div className="sg-base" />
      <div className="sg-aurora" />

      {enhanced && (
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
