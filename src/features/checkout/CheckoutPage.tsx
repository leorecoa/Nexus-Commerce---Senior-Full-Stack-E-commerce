import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { checkoutSchema } from '@/schemas'
import { useCartStore } from '@/stores/cartStore'
import { checkoutService } from '@/services/supabase/checkoutService'
import { experimentService } from '@/services/supabase/experimentService'
import { useTenantStore } from '@/stores/tenantStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useAuthStore } from '@/stores/authStore'
import { formatPrice } from '@/utils/format'

interface CheckoutFormState {
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zip: string
  paymentMethod: string
}

const defaultCheckoutForm: CheckoutFormState = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip: '',
  paymentMethod: 'card',
}

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const activeOrganizationId = useTenantStore(
    state => state.activeOrganizationId
  )
  const userId = useAuthStore(state => state.user?.id)
  const sessionId = useExperimentStore(state => state.sessionId)
  const activeVariant = useExperimentStore(state => state.activeVariant)
  const { items, clearCart, getTotal } = useCartStore()
  const checkoutSessionRef = useRef<string>(crypto.randomUUID())
  const [form, setForm] = useState<CheckoutFormState>(defaultCheckoutForm)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrganizationId || !items.length) return
    experimentService
      .trackVariantEvent({
        organizationId: activeOrganizationId,
        eventType: 'checkout_start',
        sessionId,
        userId,
        experimentId: activeVariant.experimentId,
        variantId: activeVariant.variantId,
        metadata: { item_count: items.length },
      })
      .catch(() => undefined)

    checkoutService
      .trackEvent({
        organization_id: activeOrganizationId,
        event_type: 'checkout_started',
        session_id: checkoutSessionRef.current,
        metadata: { item_count: items.length },
      })
      .catch(() => undefined)
  }, [activeOrganizationId, items.length, sessionId, userId, activeVariant])

  const checkoutMutation = useMutation({
    mutationFn: checkoutService.createOrder,
    onSuccess: data => {
      if (activeOrganizationId) {
        checkoutService
          .trackEvent({
            organization_id: activeOrganizationId,
            event_type: 'checkout_completed',
            session_id: checkoutSessionRef.current,
            metadata: { order_id: data },
          })
          .catch(() => undefined)
      }

      if (
        activeOrganizationId &&
        activeVariant.experimentId &&
        activeVariant.variantId
      ) {
        experimentService
          .trackVariantEvent({
            organizationId: activeOrganizationId,
            eventType: 'conversion',
            sessionId,
            userId,
            experimentId: activeVariant.experimentId,
            variantId: activeVariant.variantId,
            metadata: { order_id: data },
          })
          .catch(() => undefined)
      }

      clearCart()
      navigate(`/order-success/${data}`)
    },
  })

  const handleCheckout = () => {
    if (!items.length) {
      setValidationError('Your cart is empty.')
      return
    }

    const payload = {
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      shipping_address: {
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim() || undefined,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zip: form.zip.trim(),
      },
      payment_method: form.paymentMethod,
      use_wallet_balance: false,
    }

    const parsed = checkoutSchema.safeParse(payload)
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message || 'Review your checkout information.'
      )
      return
    }

    setValidationError(null)
    checkoutMutation.mutate(parsed.data)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 text-white">
      <h1 className="mb-8 text-5xl">Checkout</h1>
      <div className="glass-panel mb-6 rounded-2xl p-6">
        <h2 className="mb-4 text-3xl">Order Summary</h2>
        {items.map(item => (
          <div key={item.product.id} className="mb-2 flex justify-between">
            <span>
              {item.product.name} x {item.quantity}
            </span>
            <span>{formatPrice(item.product.price * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-4 flex justify-between border-t border-white/20 pt-4 text-xl">
          <span>Total:</span>
          <span>{formatPrice(getTotal())}</span>
        </div>
      </div>

      <div className="glass-panel mb-6 rounded-2xl p-6">
        <h2 className="mb-4 text-3xl">Shipping Details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.street}
            onChange={event => {
              setForm(prev => ({ ...prev, street: event.target.value }))
              setValidationError(null)
            }}
            placeholder="Street"
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
          <input
            value={form.number}
            onChange={event => {
              setForm(prev => ({ ...prev, number: event.target.value }))
              setValidationError(null)
            }}
            placeholder="Number"
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
          <input
            value={form.complement}
            onChange={event => {
              setForm(prev => ({ ...prev, complement: event.target.value }))
              setValidationError(null)
            }}
            placeholder="Complement (optional)"
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none sm:col-span-2"
          />
          <input
            value={form.neighborhood}
            onChange={event => {
              setForm(prev => ({
                ...prev,
                neighborhood: event.target.value,
              }))
              setValidationError(null)
            }}
            placeholder="Neighborhood"
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
          <input
            value={form.city}
            onChange={event => {
              setForm(prev => ({ ...prev, city: event.target.value }))
              setValidationError(null)
            }}
            placeholder="City"
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
          <input
            value={form.state}
            onChange={event => {
              setForm(prev => ({ ...prev, state: event.target.value }))
              setValidationError(null)
            }}
            placeholder="State"
            maxLength={2}
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white uppercase outline-none"
          />
          <input
            value={form.zip}
            onChange={event => {
              setForm(prev => ({ ...prev, zip: event.target.value }))
              setValidationError(null)
            }}
            placeholder="ZIP code"
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
          <select
            value={form.paymentMethod}
            onChange={event => {
              setForm(prev => ({
                ...prev,
                paymentMethod: event.target.value,
              }))
              setValidationError(null)
            }}
            className="rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white outline-none sm:col-span-2"
          >
            <option value="card" className="bg-slate-900">
              Credit card
            </option>
            <option value="pix" className="bg-slate-900">
              PIX
            </option>
            <option value="wallet" className="bg-slate-900">
              Wallet
            </option>
          </select>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={checkoutMutation.isPending || !items.length}
        className="w-full rounded-full bg-[color:var(--theme-accent)] py-3 text-slate-900"
      >
        {checkoutMutation.isPending ? 'Processing...' : 'Place Order'}
      </button>
      {validationError && (
        <p className="mt-4 text-center text-amber-200">{validationError}</p>
      )}
      {checkoutMutation.error && (
        <p className="mt-4 text-center text-red-300">
          {checkoutMutation.error.message}
        </p>
      )}
    </div>
  )
}
