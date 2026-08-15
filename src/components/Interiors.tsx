import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ZoomIn } from 'lucide-react'
import { useRef } from 'react'
import { Lightbox, type LightboxImage } from './Lightbox'

interface Room {
  image: string
  caption: string
  tag: string
}

const rooms: Room[] = [
  { image: 'room-wood', caption: 'Гостиная · Дуб натуральный', tag: 'Wood' },
  { image: 'room-fabric', caption: 'Спальня · Тканевая фактура', tag: 'Fabric' },
  { image: 'room-metal', caption: 'Кабинет · Металл', tag: 'Metal' },
  { image: 'room-plaster', caption: 'Прихожая · Штукатурка', tag: 'Plaster' },
  { image: 'hero-soft-new', caption: 'Спальня · Soft-touch', tag: 'Soft-touch' },
]

function roomSrc(r: Room) {
  return `catalog/${r.image === 'hero-soft-new' ? 'hero' : 'rooms'}/${r.image}.jpg`
}

const lightboxImages: LightboxImage[] = rooms.map((r) => ({ src: roomSrc(r), caption: r.caption, tag: r.tag }))

function ParallaxCard({
  r,
  i,
  onOpen,
}: {
  r: Room
  i: number
  onOpen: (i: number) => void
}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // Изображение смещается по Y на 20% внутри контейнера во время скролла
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%'])

  return (
    <motion.div
      ref={ref}
      className={`interior-card ${i === 0 ? 'wide' : i === 1 ? 'tall' : ''}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: 'hidden', position: 'relative' }}
      onClick={() => onOpen(i)}
    >
      <motion.img
        src={roomSrc(r)}
        alt={r.caption}
        loading="lazy"
        // Scale 1.2 нужен, чтобы при параллаксе не вылезали белые края картинки
        style={{ y, scale: 1.2, position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div className="interior-veil" />
      <div className="interior-tag">{r.tag}</div>
      <p className="interior-caption">{r.caption}</p>
      <div className="interior-zoom">
        <ZoomIn size={18} />
      </div>
    </motion.div>
  )
}

export function Interiors() {
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <section className="section interiors" id="interiors">
      <div className="container">
        <div className="section-head-flex">
          <div>
            <p className="eyebrow">В интерьере</p>
            <h2>Домэра<br/>в пространстве</h2>
          </div>
          <p className="lead">
            Как панели выглядят в реальных проектах: объём, свет
            и характер фактур в гостиных, спальнях и лофтах.
          </p>
        </div>

        <div className="interiors-grid">
          {rooms.map((r, i) => (
            <ParallaxCard key={r.image} r={r} i={i} onOpen={setLightbox} />
          ))}
        </div>
      </div>

      {lightbox != null && (
        <Lightbox
          images={lightboxImages}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
        />
      )}
    </section>
  )
}