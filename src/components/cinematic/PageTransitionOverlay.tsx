import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export const PageTransitionOverlay = () => {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="route-overlay"
        initial={{ opacity: 0.38, scale: 1.02, filter: 'blur(6px)' }}
        animate={{ opacity: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </AnimatePresence>
  )
}
