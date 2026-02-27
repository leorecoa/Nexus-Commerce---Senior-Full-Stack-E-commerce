import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export const ScrollProgressIndicator = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const next = maxScroll <= 0 ? 0 : (scrollTop / maxScroll) * 100
      setProgress(next)
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 lg:block" aria-hidden>
      <div className="h-44 w-1 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="w-full rounded-full bg-[color:var(--theme-accent)]"
          animate={{ height: `${progress}%` }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
