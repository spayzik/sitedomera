import { AnimatePresence, motion } from 'framer-motion'

export function Preloader({ done }: { done: boolean }) {
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="preloader"
          exit={{ y: '-100%', transition: { duration: 0.9, ease: [0.83, 0, 0.17, 1] } }}
        >
          <div className="preloader-content">
            <div className="preloader-logo-stage">
              <div className="preloader-ghost-wrap" aria-hidden="true">
                <motion.div
                  className="preloader-ghost"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                >
                  ДОМЭРА
                </motion.div>
              </div>
              <motion.div
                className="preloader-logo"
                initial={{ opacity: 0, y: 42, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              >
                ДОМЭРА
              </motion.div>
            </div>
            <motion.p
              className="preloader-tag"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              Стеновые панели · Коллекция 2026
            </motion.p>
            <motion.div
              className="preloader-line"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
