import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Product } from '@/types'
import { CinematicButton } from '@/components/cinematic/CinematicButton'
import { FALLBACK_PRODUCT_IMAGE } from '@/app/constants'

interface CinematicHeroProps {
  products: Product[]
  activeProductId?: string
  onSelectProduct: (productId: string) => void
  onPrimaryCtaClick?: () => void
}

export const CinematicHero = ({
  products,
  activeProductId,
  onSelectProduct,
  onPrimaryCtaClick,
}: CinematicHeroProps) => {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -100])

  const activeProduct = useMemo(
    () =>
      products.find(product => product.id === activeProductId) ?? products[0],
    [activeProductId, products]
  )

  return (
    <section className="relative flex min-h-[110vh] items-center overflow-hidden px-5 pb-10 pt-28 md:px-10">
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y }}
      >
        <div className="absolute -left-40 top-8 h-72 w-72 rounded-full bg-white/10 blur-[120px]" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-[color:var(--theme-accent)]/20 blur-[140px]" />
      </motion.div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, filter: 'blur(10px)', y: 24 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-sm uppercase tracking-[0.35em] text-white/70"
          >
            Products Reimagined
          </motion.p>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeProduct?.id || 'hero-fallback'}
              initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-6xl leading-[0.9] text-white md:text-8xl">
                {activeProduct?.name || 'Flagship Collection'}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-200 md:text-2xl">
                {activeProduct?.description ||
                  'Uma experiência premium com narrativa visual e performance sólida.'}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link to="/products">
              <CinematicButton
                tone="accent"
                className="inline-flex items-center gap-2"
                onClick={onPrimaryCtaClick}
              >
                Comprar Agora
                <ArrowRight size={18} />
              </CinematicButton>
            </Link>
            <span className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/80">
              A partir de ${activeProduct?.price?.toFixed(2) || '0.00'}
            </span>
          </motion.div>

          {products.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {products.slice(0, 4).map(product => {
                const isActive = product.id === activeProduct?.id
                return (
                  <button
                    key={product.id}
                    onClick={() => onSelectProduct(product.id)}
                    className={`rounded-full px-4 py-2 text-sm transition-all ${
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'border border-white/30 text-white/80 hover:border-white/80'
                    }`}
                  >
                    {product.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct?.id || 'hero-product'}
            className="story-card relative mx-auto max-w-lg"
            initial={{ opacity: 0, y: 40, rotateY: -14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotateY: -5, scale: 1 }}
            exit={{ opacity: 0, y: -20, rotateY: 8, scale: 0.92 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 20,
              mass: 0.65,
            }}
          >
            <div className="absolute -inset-8 rounded-[2.5rem] bg-[color:var(--theme-accent)]/25 blur-3xl" />
            <div className="glass-panel relative rounded-[2.5rem] p-5">
              <img
                src={activeProduct?.image_url || FALLBACK_PRODUCT_IMAGE}
                alt={activeProduct?.name || 'Featured product'}
                loading="eager"
                decoding="async"
                onError={event => {
                  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE
                }}
                className="w-full rounded-[2rem] object-cover"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
