import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { experimentService } from '@/services/supabase/experimentService'
import { useTenantStore } from '@/stores/tenantStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useAuthStore } from '@/stores/authStore'

export const OrderSuccessPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const activeOrganizationId = useTenantStore(
    state => state.activeOrganizationId
  )
  const sessionId = useExperimentStore(state => state.sessionId)
  const activeVariant = useExperimentStore(state => state.activeVariant)
  const userId = useAuthStore(state => state.user?.id)

  useEffect(() => {
    if (!activeOrganizationId) return
    experimentService
      .trackVariantEvent({
        organizationId: activeOrganizationId,
        eventType: 'conversion',
        sessionId,
        userId,
        experimentId: activeVariant.experimentId,
        variantId: activeVariant.variantId,
        metadata: { order_id: orderId },
      })
      .catch(() => undefined)
  }, [activeOrganizationId, sessionId, userId, activeVariant, orderId])

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-white">
      <div className="glass-panel rounded-3xl p-10 text-center">
        <CheckCircle className="mx-auto mb-4 h-24 w-24 text-emerald-300" />
        <h1 className="mb-4 text-5xl">Order Successful!</h1>
        <p className="mb-8 text-white/70">Order ID: {orderId}</p>
        <button
          onClick={() => navigate('/products')}
          className="rounded-full bg-[color:var(--theme-accent)] px-7 py-3 text-slate-900"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  )
}
