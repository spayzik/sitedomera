import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface LightboxImage {
  src: string
  caption: string
  tag: string
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onIndex])

  const img = images[index]

  return (
    <AnimatePresence>
      {img && (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="lightbox-backdrop" onClick={onClose} />
          <motion.figure
            className="lightbox-figure"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <img key={img.src} src={img.src} alt={img.caption} />
            <figcaption>
              <span className="lightbox-tag">{img.tag}</span>
              <span className="lightbox-caption">{img.caption}</span>
              <span className="lightbox-count">
                {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </span>
            </figcaption>
          </motion.figure>
          <button
            className="lightbox-nav prev"
            onClick={() => onIndex((index - 1 + images.length) % images.length)}
            aria-label="Предыдущее"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className="lightbox-nav next"
            onClick={() => onIndex((index + 1) % images.length)}
            aria-label="Следующее"
          >
            <ChevronRight size={22} />
          </button>
          <button className="lightbox-close" onClick={onClose} aria-label="Закрыть">
            <X size={22} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}