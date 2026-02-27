import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/stores/cartStore'

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] })
  })

  it('should add item to cart', () => {
    const product = { id: '1', name: 'Test', price: 100, stock_quantity: 10, is_active: true, created_at: '', updated_at: '' }
    useCartStore.getState().addItem(product, 2)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('should calculate total', () => {
    const product = { id: '1', name: 'Test', price: 100, stock_quantity: 10, is_active: true, created_at: '', updated_at: '' }
    useCartStore.getState().addItem(product, 2)
    expect(useCartStore.getState().getTotal()).toBe(200)
  })
})
