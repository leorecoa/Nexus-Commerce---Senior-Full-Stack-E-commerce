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
    const stripeEventId = payload?.id as string | undefined
    const eventType = payload?.type as string | undefined

    if (!stripeEventId || !eventType) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: existingWebhook } = await supabase
      .from('billing_webhook_events')
      .select('id, status, retry_count')
      .eq('stripe_event_id', stripeEventId)
      .maybeSingle()

    if (existingWebhook?.status === 'processed') {
      logInfo('Duplicate processed stripe event', { requestId, stripeEventId })
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const webhookEvent = existingWebhook
      ? existingWebhook
      : (
          await supabase
            .from('billing_webhook_events')
            .insert({
              stripe_event_id: stripeEventId,
              event_type: eventType,
              payload,
              status: 'received',
            })
            .select('id, retry_count')
            .single()
        ).data

    if (!webhookEvent?.id) {
      throw new Error('Failed to persist webhook event')
    }

    let processingError: string | null = null

    if (payload.type === 'payment_intent.succeeded') {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', payload.data.object.metadata.order_id)

      if (error) {
        processingError = error.message
        logError('Failed to update order status in payment-webhook', {
          requestId,
          orderId: payload.data.object.metadata.order_id,
          error: error.message,
        })
      }
    }

    const nextRetryCount = (webhookEvent.retry_count ?? 0) + 1

    await supabase.from('billing_webhook_attempts').insert({
      webhook_event_id: webhookEvent.id,
      attempt_number: nextRetryCount,
      succeeded: processingError === null,
      error: processingError,
    })

    await supabase
      .from('billing_webhook_events')
      .update({
        status: processingError ? 'failed' : 'processed',
        retry_count: nextRetryCount,
        last_error: processingError,
        processed_at: processingError ? null : new Date().toISOString(),
      })
      .eq('id', webhookEvent.id)

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
