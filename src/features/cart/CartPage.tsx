import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/stores/cartStore'
import { Trash2 } from 'lucide-react'

export const CartPage = () => {
  const navigate = useNavigate()
  const { items, removeItem, updateQuantity, getTotal } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-28 text-center text-white">
        <h1 className="mb-4 text-5xl">Your Cart is Empty</h1>
        <button
          onClick={() => navigate('/products')}
          className="rounded-full bg-[color:var(--theme-accent)] px-6 py-3 text-slate-900"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-20 pt-28 text-white">
      <h1 className="mb-8 text-5xl">Shopping Cart</h1>
      <div className="space-y-4">
        {items.map(item => (
          <div
            key={item.product.id}
            className="glass-panel flex items-center gap-4 rounded-2xl p-4"
          >
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="h-24 w-24 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h3 className="text-2xl">{item.product.name}</h3>
              <p className="text-white/70">${item.product.price}</p>
            </div>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={event =>
                updateQuantity(
                  item.product.id,
                  parseInt(event.target.value, 10)
                )
              }
              className="w-20 rounded-xl border border-white/25 bg-slate-900/60 px-2 py-1"
            />
            <button
              onClick={() => removeItem(item.product.id)}
              className="rounded-xl p-2 text-red-300 hover:bg-red-400/20"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-white/20 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-2xl">Total:</span>
          <span className="text-2xl">${getTotal().toFixed(2)}</span>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="w-full rounded-full bg-[color:var(--theme-accent)] py-3 text-slate-900"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  )
}
