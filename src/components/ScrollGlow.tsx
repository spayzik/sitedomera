import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function ScrollGlow() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)')
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)')
    const update = () => {
      setReduced(coarse.matches || !motionOk.matches)
    }
    update()
    coarse.addEventListener?.('change', update)
    motionOk.addEventListener?.('change', update)
    return () => {
      coarse.removeEventListener?.('change', update)
      motionOk.removeEventListener?.('change', update)
    }
  }, [])

  useEffect(() => {
    if (reduced) return
    const onMouseMove = (e: MouseEvent) => {
      // Инерционное следование за мышью
      setMouse({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      })
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [reduced])

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: -1, 
        overflow: 'hidden', 
        pointerEvents: 'none',
        background: 'var(--bg)' // Deep dark base
      }} 
      aria-hidden="true"
    >
      {/* Более богатый основной градиент: добавляем теплые медные/янтарные оттенки */}
      <motion.div
        animate={reduced ? undefined : {
          y: ['-10%', '10%', '-10%'],
          opacity: [0.6, 0.9, 0.6],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 16,
          repeat: reduced ? 0 : Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          right: '-10%',
          height: '110vh',
          background: 'linear-gradient(180deg, rgba(200, 150, 90, 0.12) 0%, rgba(194, 163, 120, 0.04) 40%, transparent 100%)',
          filter: 'blur(80px)',
          transformOrigin: 'top center'
        }}
      />
      
      {/* 2. Блуждающая сфера 1 (Верхний правый угол) */}
      <motion.div
        animate={reduced ? undefined : {
          x: ['-5%', '10%', '-5%'],
          y: ['0%', '15%', '0%'],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 22,
          repeat: reduced ? 0 : Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-15%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160, 120, 80, 0.08) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {/* 3. Интерактивная сфера (следует за мышью) */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '40vw', height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(223, 186, 143, 0.06) 0%, transparent 60%)',
          filter: 'blur(100px)',
          transform: reduced
            ? 'translate(50vw, 50vh)'
            : `translate(calc(${mouse.x}vw - 20vw), calc(${mouse.y}vh - 20vw))`,
          transition: 'transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {/* 4. Блуждающая сфера 2 (Нижний левый угол) */}
      <motion.div
        animate={reduced ? undefined : {
          x: ['5%', '-10%', '5%'],
          y: ['10%', '-15%', '10%'],
        }}
        transition={{
          duration: 28,
          repeat: reduced ? 0 : Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          bottom: '-25%',
          left: '-20%',
          width: '65vw',
          height: '65vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194, 163, 120, 0.05) 0%, transparent 70%)',
          filter: 'blur(110px)',
        }}
      />
      
      {/* 5. Film Grain Overlay (Кинематографический шум) */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
          opacity: 0.8,
        }}
      />

      {/* 6. Texture layers: wood grain + stone dots (very subtle, over glow) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='wood'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.28' numOctaves='2' seed='7'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23wood)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'soft-light',
          opacity: 0.045,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='stone'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' seed='11'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23stone)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'soft-light',
          opacity: 0.05,
        }}
      />
    </div>
  )
}