import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

/** A few logical lines retain native responsive wrapping inside each mask. */
export function EditorialReveal({ lines, ready, className = '' }: {
  lines: ReactNode[]
  ready?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()
  const inView = useInView(ref, { once: true, amount: 0.25, margin: '0px 0px -48px 0px' })
  const shown = reducedMotion || (ready ?? inView)

  return (
    <motion.span
      ref={ref}
      className={`editorial-reveal ${className}`}
      aria-hidden="true"
      initial={reducedMotion ? false : 'hidden'}
      animate={shown ? 'shown' : 'hidden'}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: reducedMotion ? 0 : 0.11 } } }}
    >
      {lines.map((line, index) => (
        <span className="editorial-mask" key={index}>
          <motion.span
            className="editorial-line"
            variants={{
              hidden: { y: '112%' },
              shown: { y: 0, transition: { duration: reducedMotion ? 0 : 0.82, ease: [0.16, 1, 0.3, 1] } },
            }}
          >{line}</motion.span>
        </span>
      ))}
    </motion.span>
  )
}
