import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logError, logInfo } from '../_shared/monitoring.ts'

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    const requestId = crypto.randomUUID()

    if (!signature) {
      logError('Missing stripe signature', { requestId })
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (payload.type === 'payment_intent.succeeded') {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', payload.data.object.metadata.order_id)

      if (error) {
        logError('Failed to update order status in payment-webhook', {
          requestId,
          orderId: payload.data.object.metadata.order_id,
          error: error.message,
        })
      }
    }

    logInfo('payment-webhook processed', { requestId, type: payload.type })

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logError('Unhandled error in payment-webhook', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
