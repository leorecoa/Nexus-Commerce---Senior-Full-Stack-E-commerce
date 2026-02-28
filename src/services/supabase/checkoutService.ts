import { supabase } from '@/lib/supabase'
import { CheckoutInput } from '@/schemas'

export const checkoutService = {
  async createOrder(data: CheckoutInput) {
    const { data: result, error } = await supabase.rpc('create_order', {
      p_items: data.items,
      p_shipping_address: data.shipping_address,
      p_payment_method: data.payment_method,
      p_use_wallet_balance: data.use_wallet_balance,
    })
    if (error) throw error
    return result
  },

  async getOrders(organizationId?: string | null) {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getOrderById(id: string, organizationId?: string | null) {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.single()
    if (error) throw error
    return data
  },

  async trackEvent(input: {
    organization_id: string
    event_type: 'checkout_started' | 'checkout_completed'
    session_id: string
    metadata?: Record<string, unknown>
  }) {
    const { error } = await supabase.from('checkout_events').insert(input)
    if (error) throw error
  },
}
