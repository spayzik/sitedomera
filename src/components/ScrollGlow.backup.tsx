import { motion } from 'framer-motion'

export function ScrollGlow() {
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
      {/* 1. Main top-to-bottom dynamic glow (как вы просили — сверху вниз) */}
      <motion.div
        animate={{
          y: ['-15%', '10%', '-15%'],
          opacity: [0.7, 1, 0.7],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          right: '-10%',
          height: '100vh',
          background: 'linear-gradient(180deg, rgba(194,163,120,0.12) 0%, rgba(194,163,120,0.03) 50%, transparent 100%)',
          filter: 'blur(80px)',
          transformOrigin: 'top center'
        }}
      />
      
      {/* 2. Secondary wandering soft orb (top right) */}
      <motion.div
        animate={{
          x: ['-5%', '5%', '-5%'],
          y: ['0%', '15%', '0%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '0%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194,163,120,0.06) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {/* 3. Tertiary wandering soft orb (bottom left) */}
      <motion.div
        animate={{
          x: ['5%', '-5%', '5%'],
          y: ['10%', '-10%', '10%'],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-20%',
          width: '60vw',
          height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194,163,120,0.05) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      
      {/* 4. Film Grain Overlay (The secret to expensive look) */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
          opacity: 0.7,
        }}
      />
    </div>
  )
}