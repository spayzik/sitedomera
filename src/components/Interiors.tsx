import { LogoIcon } from './Logo'
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
  { image: 'interior-living', width: 1122, height: 1402, caption: 'Гостиная с каменной фактурой и рейками', tag: 'Гостиная' },
  { image: 'interior-bedroom', width: 1122, height: 1402, caption: 'Спальня с акцентной стеной', tag: 'Спальня' },
  { image: 'interior-dining', width: 1122, height: 1402, caption: 'Столовая в тёплых тонах', tag: 'Столовая' },
  { image: 'interior-metal', width: 1448, height: 1086, caption: 'Металлическая фактура с подсветкой', tag: 'Металл' },
  { image: 'interior-fabric', width: 1122, height: 1402, caption: 'Тканевая фактура вблизи', tag: 'Ткань' },
]

function roomSrc(r: Room) {
  return `catalog/rooms/${r.image}.webp`
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
      className="interior-card"
      initial={reducedMotion ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : i * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className="interior-photo" aria-label={`Открыть интерьер: ${r.caption}`} onClick={() => onOpen(i)}>
        <img src={roomSrc(r)} alt={r.caption} loading="lazy" width={r.width} height={r.height} />
        <span className="interior-zoom" aria-hidden="true"><ZoomIn size={18} /></span>
      </button>
      <p className="interior-caption">{r.caption}</p>
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
            <h2>Декорай<br/>в пространстве</h2>
          </div>
          <p className="lead">
            Посмотрите, как фактуры выглядят рядом с мебелью и при разном освещении.
          </p>
        </div>

        <div className="interiors-grid">
          <InteriorCard r={rooms[0]} i={0} onOpen={setLightbox} />
          <div className="interior-previews">
            {rooms.slice(1).map((r, i) => (
              <InteriorCard key={r.image} r={r} i={i + 1} onOpen={setLightbox} />
            ))}
          </div>
        </div>
        <figure className="interior-concept">
          <div className="interior-concept-heading">
            <LogoIcon size={30} />
            <h3>Древесная фактура в двух интерьерах</h3>
          </div>
          <div className="interior-concept-media">
            <div className="interior-concept-sample">
              <img src="catalog/products/C807601-36.webp" alt="Образец панели «Ясень песочный»" loading="lazy" width="360" height="360" />
              <small>Фото образца · C807601-36</small>
            </div>
            <img src="catalog/rooms/concept-wood.webp" srcSet="catalog/rooms/concept-wood-small.webp 720w, catalog/rooms/concept-wood.webp 1440w"
              sizes="(max-width: 700px) 88vw, 66vw" alt="Варианты отделки стен в столовой и прихожей"
              loading="lazy" width="1440" height="960" />
          </div>
          <figcaption>AI-визуализация применения. Фактура и цвет в интерьере приведены для примера.</figcaption>
        </figure>
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
