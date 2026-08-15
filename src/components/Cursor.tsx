import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function Cursor() {
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  // Trail follows slowly — the "light streak" behind the cursor
  const trailX = useSpring(mouseX, { damping: 45, stiffness: 250, mass: 0.6 })
  const trailY = useSpring(mouseY, { damping: 45, stiffness: 250, mass: 0.6 })

  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      // Hover detection with small batch — avoids re-render spam via rAF
      const target = e.target as HTMLElement
      const next = !!target.closest('a, button, input, textarea, .card-arch, .gocek-thumb, .interactive')
      setHover((prev) => (prev === next ? prev : next))
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [mouseX, mouseY])

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null
  }

  return (
    <>
      <motion.div
        className="custom-cursor-trail"
        style={{ x: trailX, y: trailY }}
      />
      <motion.div
        className={`custom-cursor-dot ${hover ? 'hovered' : ''}`}
        style={{ x: mouseX, y: mouseY }}
      />
    </>
  )
}
