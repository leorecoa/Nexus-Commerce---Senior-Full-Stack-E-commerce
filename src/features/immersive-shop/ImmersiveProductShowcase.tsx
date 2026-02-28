import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Product } from '@/types'
import { FALLBACK_PRODUCT_IMAGE } from '@/app/constants'

interface ImmersiveProductShowcaseProps {
  products: Product[]
}

export const ImmersiveProductShowcase = ({
  products,
}: ImmersiveProductShowcaseProps) => {
  const railRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const x = useTransform(scrollYProgress, [0.1, 0.9], ['5%', '-20%'])

  if (products.length === 0) {
    return null
  }

  return (
    <section
      ref={railRef}
      className="relative overflow-hidden px-5 pb-24 md:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-5xl text-white md:text-6xl">
            Editorial Product Rail
          </h2>
          <Link
            to="/products"
            className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/80 hover:border-white"
          >
            Ver catálogo completo
          </Link>
        </div>

        <motion.div style={{ x }} className="flex gap-6">
          {products.slice(0, 6).map((product, index) => (
            <motion.article
              key={product.id}
              whileHover={{ y: -8, rotate: index % 2 === 0 ? -1.2 : 1.2 }}
              transition={{ type: 'spring', stiffness: 190, damping: 18 }}
              className={`glass-panel shrink-0 rounded-[2rem] p-4 ${index % 3 === 0 ? 'w-[360px]' : 'w-[300px]'}`}
            >
              <div className="overflow-hidden rounded-[1.5rem]">
                <img
                  src={product.image_url || FALLBACK_PRODUCT_IMAGE}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  onError={event => {
                    event.currentTarget.src = FALLBACK_PRODUCT_IMAGE
                  }}
                  className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                  #{String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-3xl text-white">{product.name}</h3>
                <p className="mt-2 text-sm text-white/70">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
