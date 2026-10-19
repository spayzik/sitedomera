import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ZoomIn } from 'lucide-react'
import { Lightbox, type LightboxImage } from './Lightbox'

interface Room {
  image: string
  caption: string
  tag: string
  width: number
  height: number
}

const rooms: Room[] = [
  { image: 'room-wood', width: 1429, height: 808, caption: 'Гостиная · Деревянная фактура', tag: 'Wood' },
  { image: 'room-fabric', width: 1310, height: 1019, caption: 'Спальня · Тканевая фактура', tag: 'Fabric' },
  { image: 'room-metal', width: 1310, height: 1019, caption: 'Кабинет · Металл', tag: 'Metal' },
  { image: 'room-plaster', width: 1310, height: 1019, caption: 'Прихожая · Штукатурка', tag: 'Plaster' },
  { image: 'hero-soft-new', width: 1024, height: 1024, caption: 'Спальня · Soft-touch', tag: 'Soft-touch' },
]

function roomSrc(r: Room) {
  return `catalog/${r.image === 'hero-soft-new' ? 'hero' : 'rooms'}/${r.image}.webp`
}

const lightboxImages: LightboxImage[] = rooms.map((r) => ({ src: roomSrc(r), caption: r.caption, tag: r.tag }))

function InteriorCard({
  r,
  i,
  onOpen,
}: {
  r: Room
  i: number
  onOpen: (i: number) => void
}) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      className={`interior-card ${i === 0 ? 'wide' : ''}`}
      initial={reducedMotion ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : i * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(i)}
    >
      <img
        src={roomSrc(r)}
        alt={r.caption}
        loading="lazy"
        width={r.width}
        height={r.height}
      />
      <div className="interior-tag">{r.tag}</div>
      <p className="interior-caption">{r.caption}</p>
      <button className="interior-zoom" aria-label={`Открыть интерьер: ${r.caption}`} onClick={(event) => { event.stopPropagation(); onOpen(i) }}>
        <ZoomIn size={18} />
      </button>
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
            Примеры оформления интерьера: объём, свет
            и характер фактур. Изображения не подтверждают соответствие конкретному артикулу каталога.
          </p>
        </div>

        <div className="interiors-grid">
          {rooms.map((r, i) => (
            <InteriorCard key={r.image} r={r} i={i} onOpen={setLightbox} />
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
