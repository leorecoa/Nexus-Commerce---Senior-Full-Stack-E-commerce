import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productService } from '@/services/supabase/productService'
import { sceneService } from '@/services/supabase/sceneService'
import { useThemeEngineStore } from '@/features/theme-engine/themeStore'
import { CinematicHero } from '@/features/hero/CinematicHero'
import { StorytellingSections } from '@/features/storytelling/StorytellingSections'
import { ImmersiveProductShowcase } from '@/features/immersive-shop/ImmersiveProductShowcase'
import { useTenantStore } from '@/stores/tenantStore'

export const HomePage = () => {
  const activeOrganizationId = useTenantStore(state => state.activeOrganizationId)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', activeOrganizationId],
    queryFn: () => productService.getAll(activeOrganizationId),
    staleTime: 60_000,
  })

  const sceneOrganizationId = activeOrganizationId ?? products[0]?.organization_id

  const { data: scenes = [] } = useQuery({
    queryKey: ['story-scenes-public', sceneOrganizationId],
    queryFn: () => sceneService.getPublicByOrganization(sceneOrganizationId!),
    enabled: Boolean(sceneOrganizationId),
    staleTime: 60_000,
    retry: false,
  })

  const featured = useMemo(() => products.slice(0, 6), [products])
  const [activeProductId, setActiveProductId] = useState<string | undefined>(undefined)
  const setThemeFromProduct = useThemeEngineStore(state => state.setThemeFromProduct)

  useEffect(() => {
    if (!featured.length) {
      return
    }

    setActiveProductId(prev => prev ?? featured[0].id)
  }, [featured])

  const activeProduct = useMemo(
    () => featured.find(product => product.id === activeProductId) ?? featured[0],
    [featured, activeProductId]
  )

  useEffect(() => {
    setThemeFromProduct(activeProduct)
  }, [activeProduct, setThemeFromProduct])

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-5 md:px-10">
        <div className="w-full space-y-4">
          <div className="skeleton-premium h-8 w-40 rounded-full" />
          <div className="skeleton-premium h-24 w-full rounded-3xl" />
          <div className="skeleton-premium h-72 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <CinematicHero
        products={featured}
        activeProductId={activeProductId}
        onSelectProduct={setActiveProductId}
      />
      <StorytellingSections products={featured} scenes={scenes} />
      <ImmersiveProductShowcase products={featured} />
    </div>
  )
}
