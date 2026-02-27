import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { logError, logInfo } from '../_shared/monitoring.ts'

serve(async (req) => {
  try {
    const { to, subject, body } = await req.json()
    const requestId = crypto.randomUUID()

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@techstore.com' },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logError('Failed to send email', {
        requestId,
        to,
        status: response.status,
        response: errorText,
      })
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    logInfo('Email sent', { requestId, to })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logError('Unhandled error in send-email', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
