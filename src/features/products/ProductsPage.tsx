import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingCart, Sparkles } from 'lucide-react'
import { productService } from '@/services/supabase/productService'
import { experimentService } from '@/services/supabase/experimentService'
import { useCartStore } from '@/stores/cartStore'
import { useTenantStore } from '@/stores/tenantStore'
import { useThemeEngineStore } from '@/features/theme-engine/themeStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useAuthStore } from '@/stores/authStore'
import { CinematicButton } from '@/components/cinematic/CinematicButton'
import { FALLBACK_PRODUCT_IMAGE } from '@/app/constants'

const PAGE_SIZE = 6

export const ProductsPage = () => {
  const activeOrganizationId = useTenantStore(
    state => state.activeOrganizationId
  )
  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', activeOrganizationId],
    queryFn: () => productService.getAll(activeOrganizationId),
    staleTime: 60_000,
  })

  const addItem = useCartStore(state => state.addItem)
  const userId = useAuthStore(state => state.user?.id)
  const sessionId = useExperimentStore(state => state.sessionId)
  const activeVariant = useExperimentStore(state => state.activeVariant)
  const setThemeFromProduct = useThemeEngineStore(
    state => state.setThemeFromProduct
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [infiniteMode, setInfiniteMode] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE))

  useEffect(() => {
    setThemeFromProduct(products[0])
  }, [products, setThemeFromProduct])

  useEffect(() => {
    if (!infiniteMode) {
      setVisibleCount(PAGE_SIZE)
    }
  }, [infiniteMode])

  useEffect(() => {
    if (!infiniteMode) {
      return
    }

    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, products.length))
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [products.length, infiniteMode])

  const visibleProducts = useMemo(() => {
    if (infiniteMode) {
      return products.slice(0, visibleCount)
    }

    const start = (currentPage - 1) * PAGE_SIZE
    return products.slice(start, start + PAGE_SIZE)
  }, [products, infiniteMode, visibleCount, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-20 pt-28 md:px-10">
        <div className="mb-10 flex items-center justify-between">
          <div className="skeleton-premium h-12 w-60 rounded-full" />
          <div className="skeleton-premium h-10 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="skeleton-premium h-[420px] rounded-[2rem]"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="glass-panel rounded-3xl p-8">
          <p className="text-2xl text-red-300">Erro ao carregar produtos</p>
          <p className="mt-2 text-white/70">
            Verifique sua conexão com o banco de dados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-20 pt-28 md:px-10">
      <section className="mb-14 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            Immersive Shop
          </p>
          <h1 className="text-6xl leading-[0.9] text-white md:text-7xl">
            Products
          </h1>
          <p className="mt-3 text-white/70">
            Curadoria editorial com atmosfera dinâmica por produto.
          </p>
        </div>

        <button
          onClick={() => setInfiniteMode(prev => !prev)}
          className="rounded-full border border-white/30 px-5 py-2 text-sm text-white/80 transition hover:border-white"
        >
          {infiniteMode ? 'Paginação por páginas' : 'Ativar Infinite Scroll'}
        </button>
      </section>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${infiniteMode ? 'inf' : 'page'}-${currentPage}-${visibleCount}`}
          initial={{ opacity: 0, filter: 'blur(10px)', y: 16 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(8px)', y: -8 }}
          transition={{ duration: 0.55 }}
          className="grid auto-rows-[230px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {visibleProducts.map((product, index) => {
            const large = index % 5 === 0
            const wide = index % 4 === 0

            return (
              <motion.article
                key={product.id}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className={`glass-panel group relative overflow-hidden rounded-[2rem] p-4 ${large ? 'md:row-span-2' : ''} ${
                  wide ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-[color:var(--theme-accent)]/15 opacity-70" />

                <div className="relative flex h-full flex-col">
                  <div className="relative overflow-hidden rounded-[1.5rem]">
                    <img
                      src={product.image_url || FALLBACK_PRODUCT_IMAGE}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      onError={event => {
                        event.currentTarget.src = FALLBACK_PRODUCT_IMAGE
                      }}
                      className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
                        large ? 'h-72 md:h-[380px]' : 'h-48'
                      }`}
                    />
                    <div className="absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/75">
                      {product.type || 'Tech'}
                    </div>
                  </div>

                  <div className="mt-4 flex grow flex-col justify-between">
                    <div>
                      <h2 className="text-3xl leading-none text-white">
                        {product.name}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-white/70">
                        {product.description ||
                          'Produto premium com experiência de uso elevada.'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-2xl font-semibold text-white">
                        ${product.price.toFixed(2)}
                      </p>
                      <CinematicButton
                        tone="accent"
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm"
                        onClick={() => {
                          addItem(product, 1)
                          if (!activeOrganizationId) return
                          experimentService
                            .trackVariantEvent({
                              organizationId: activeOrganizationId,
                              eventType: 'add_to_cart',
                              sessionId,
                              userId,
                              experimentId: activeVariant.experimentId,
                              variantId: activeVariant.variantId,
                              metadata: { product_id: product.id },
                            })
                            .catch(() => undefined)
                        }}
                      >
                        <ShoppingCart size={16} />
                        Add
                      </CinematicButton>
                    </div>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.section>
      </AnimatePresence>

      {products.length === 0 && (
        <div className="glass-panel mt-8 rounded-3xl p-8 text-center">
          <Sparkles className="mx-auto mb-4 text-white/60" size={38} />
          <h2 className="text-3xl text-white">Catálogo em atualização</h2>
          <p className="mt-2 text-white/65">
            Novos produtos premium serão publicados em breve.
          </p>
        </div>
      )}

      {!infiniteMode && products.length > PAGE_SIZE && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`h-11 min-w-11 rounded-full px-4 text-sm transition ${
                page === currentPage
                  ? 'bg-[color:var(--theme-accent)] text-slate-950'
                  : 'border border-white/30 text-white/80 hover:border-white'
              }`}
            >
              {String(page).padStart(2, '0')}
            </button>
          ))}
        </div>
      )}

      {infiniteMode && <div ref={sentinelRef} className="h-20" aria-hidden />}
    </div>
  )
}
