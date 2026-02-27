import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/stores/cartStore'
import { checkoutService } from '@/services/supabase/checkoutService'

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const { items, clearCart, getTotal } = useCartStore()

  const checkoutMutation = useMutation({
    mutationFn: checkoutService.createOrder,
    onSuccess: data => {
      clearCart()
      navigate(`/order-success/${data}`)
    },
  })

  const handleCheckout = () => {
    checkoutMutation.mutate({
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      shipping_address: {
        street: '123 Main St',
        number: '100',
        neighborhood: 'Manhattan',
        city: 'New York',
        state: 'NY',
        zip: '10001',
      },
      use_wallet_balance: false,
    })
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
            <span>${(item.product.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="mt-4 flex justify-between border-t border-white/20 pt-4 text-xl">
          <span>Total:</span>
          <span>${getTotal().toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={handleCheckout}
        disabled={checkoutMutation.isPending}
        className="w-full rounded-full bg-[color:var(--theme-accent)] py-3 text-slate-900"
      >
        {checkoutMutation.isPending ? 'Processing...' : 'Place Order'}
      </button>
      {checkoutMutation.error && <p className="mt-4 text-center text-red-300">{checkoutMutation.error.message}</p>}
    </div>
  )
}

