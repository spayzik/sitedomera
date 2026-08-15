import { useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'

export function TiltCard({ children, max = 8, className = '' }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 160, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 160, damping: 20 })

  const glareX = useTransform(px, [0, 1], ['12%', '88%'])
  const glareY = useTransform(py, [0, 1], ['12%', '88%'])
  const glare = useMotionTemplate`radial-gradient(560px circle at ${glareX} ${glareY}, rgba(255,255,255,0.16), transparent 45%)`

  const onMove = (e: ReactMouseEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <div className={`tilt-wrap ${className}`} style={{ perspective: 1100 }}>
      <motion.div
        ref={ref}
        className="tilt-inner"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {children}
        <motion.div className="tilt-glare" style={{ background: glare }} />
      </motion.div>
    </div>
  )
}