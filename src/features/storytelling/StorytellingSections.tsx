import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Product, StoryScene } from '@/types'
import { FALLBACK_PRODUCT_IMAGE } from '@/app/constants'

interface StorytellingSectionsProps {
  products: Product[]
  scenes?: StoryScene[]
}

const frames = [
  {
    title: 'Engineering + Emotion',
    subtitle: 'Cada detalhe comunica precisão, velocidade e desejo.',
  },
  {
    title: 'Performance Sem Ruído',
    subtitle: 'Scroll suave, feedback tátil visual e arquitetura escalável.',
  },
  {
    title: 'Sua Próxima Escolha',
    subtitle: 'O produto assume o palco e guia a decisão com clareza.',
  },
]

export const StorytellingSections = ({
  products,
  scenes = [],
}: StorytellingSectionsProps) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()

  const depth = useTransform(scrollYProgress, [0.15, 0.95], [30, -30])
  const renderFrames = scenes.length
    ? scenes.map(scene => ({
        key: scene.id,
        title: String(scene.content.title || 'Story Scene'),
        subtitle: String(
          scene.content.subtitle || 'Narrativa visual de produto premium.'
        ),
      }))
    : frames.map(frame => ({
        key: frame.title,
        title: frame.title,
        subtitle: frame.subtitle,
      }))

  return (
    <div
      ref={sectionRef}
      className="relative snap-story space-y-8 px-5 pb-24 md:px-10"
    >
      {renderFrames.map((frame, index) => {
        const product = products[index % Math.max(products.length, 1)]

        return (
          <section
            key={frame.key}
            className="relative mx-auto min-h-[70vh] max-w-7xl"
          >
            <motion.div
              style={{ y: depth }}
              initial={{ opacity: 0, filter: 'blur(14px)', scale: 0.98 }}
              whileInView={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              viewport={{ amount: 0.45, once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel grid min-h-[70vh] items-center gap-7 rounded-[2.2rem] p-7 md:grid-cols-[1.05fr_0.95fr] md:p-12"
            >
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/60">
                  Scroll Story
                </p>
                <h2 className="text-5xl leading-[0.95] text-white md:text-7xl">
                  {frame.title}
                </h2>
                <p className="mt-6 max-w-lg text-lg text-slate-200">
                  {frame.subtitle}
                </p>
              </div>

              <motion.div
                className="story-card relative"
                initial={{ rotateX: -4, rotateY: 8 }}
                whileInView={{ rotateX: 0, rotateY: 0 }}
                viewport={{ amount: 0.4, once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="absolute -inset-5 rounded-[2rem] bg-[color:var(--theme-accent)]/25 blur-3xl" />
                <img
                  src={product?.image_url || FALLBACK_PRODUCT_IMAGE}
                  alt={product?.name || 'Product narrative'}
                  loading="lazy"
                  decoding="async"
                  onError={event => {
                    event.currentTarget.src = FALLBACK_PRODUCT_IMAGE
                  }}
                  className="relative h-[340px] w-full rounded-[2rem] object-cover md:h-[430px]"
                />
              </motion.div>
            </motion.div>
          </section>
        )
      })}
    </div>
  )
}
