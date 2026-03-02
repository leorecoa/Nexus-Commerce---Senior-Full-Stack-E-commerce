import { Page, Route } from '@playwright/test'

const FIXTURE_NOW = '2026-03-02T12:00:00.000Z'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': '*',
}

const fulfillJson = async (
  route: Route,
  status: number,
  body: string
) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders,
    body,
  })
}

export const seedCartStorage = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'cart-storage',
      JSON.stringify({
        state: {
          items: [
            {
              product: {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Fixture Product',
                description: 'Produto controlado para teste E2E',
                price: 129.9,
                image_url: '',
                organization_id: '22222222-2222-2222-2222-222222222222',
              },
              quantity: 1,
            },
          ],
        },
        version: 0,
      })
    )
  })
}

export const mockCheckoutApi = async (
  page: Page,
  options: {
    orderId?: string
  } = {}
) => {
  const orderId =
    options.orderId ?? '33333333-3333-3333-3333-333333333333'

  await page.route('**/rest/v1/rpc/create_order', async route => {
    if (route.request().method() === 'OPTIONS') {
      await fulfillJson(route, 200, '{}')
      return
    }

    await fulfillJson(route, 200, JSON.stringify(orderId))
  })

  await page.route('**/rest/v1/checkout_events**', async route => {
    if (route.request().method() === 'OPTIONS') {
      await fulfillJson(route, 200, '{}')
      return
    }

    await fulfillJson(route, 201, '[]')
  })
}

export const mockOperationsApi = async (page: Page) => {
  const analyticsExports: Array<Record<string, unknown>> = []
  const webhooks: Array<Record<string, unknown>> = []
  let deadLetters: Array<Record<string, unknown>> = [
    {
      id: '44444444-4444-4444-4444-444444444444',
      webhook_id: null,
      event_type: 'checkout.completed',
      payload: { order_id: 'fixture-order' },
      attempt_count: 8,
      max_attempts: 8,
      last_error: 'Timeout',
      dead_lettered_at: FIXTURE_NOW,
      created_at: FIXTURE_NOW,
    },
  ]

  await page.route('**/rest/v1/analytics_exports**', async route => {
    if (route.request().method() === 'OPTIONS') {
      await fulfillJson(route, 200, '{}')
      return
    }

    await fulfillJson(route, 200, JSON.stringify(analyticsExports))
  })

  await page.route(
    '**/rest/v1/rpc/request_analytics_export',
    async route => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillJson(route, 200, '{}')
        return
      }

      const payload = JSON.parse(route.request().postData() || '{}')
      const nextId = `exp-${String(analyticsExports.length + 1).padStart(3, '0')}`

      analyticsExports.unshift({
        id: nextId,
        organization_id: payload.p_org_id,
        requested_by: null,
        status: 'pending',
        format: 'csv',
        filters: payload.p_filters ?? {},
        storage_path: null,
        download_url: null,
        row_count: null,
        error_message: null,
        started_at: null,
        finished_at: null,
        created_at: FIXTURE_NOW,
        updated_at: FIXTURE_NOW,
      })

      await fulfillJson(route, 200, JSON.stringify(nextId))
    }
  )

  await page.route('**/rest/v1/organization_webhooks**', async route => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const webhookId = url.searchParams.get('id')?.replace('eq.', '')

    if (method === 'GET') {
      await fulfillJson(route, 200, JSON.stringify(webhooks))
      return
    }

    if (method === 'OPTIONS') {
      await fulfillJson(route, 200, '{}')
      return
    }

    if (method === 'POST') {
      const payload = JSON.parse(request.postData() || '{}')
      const nextRecord = {
        id: '55555555-5555-5555-5555-555555555555',
        organization_id: payload.organization_id,
        name: payload.name,
        target_url: payload.target_url,
        event_types: payload.event_types ?? [],
        status: payload.status ?? 'active',
        timeout_ms: payload.timeout_ms ?? 10000,
        max_retries: payload.max_retries ?? 8,
        headers: payload.headers ?? {},
        created_by: null,
        created_at: FIXTURE_NOW,
        updated_at: FIXTURE_NOW,
      }

      webhooks.unshift(nextRecord)

      await fulfillJson(route, 201, JSON.stringify(nextRecord))
      return
    }

    if (method === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}')
      const current =
        webhooks.find(item => item.id === webhookId) ?? webhooks[0] ?? null

      const nextRecord = {
        ...current,
        ...payload,
        id: webhookId ?? current?.id ?? '55555555-5555-5555-5555-555555555555',
        updated_at: payload.updated_at ?? FIXTURE_NOW,
      }

      if (current) {
        const index = webhooks.findIndex(item => item.id === current.id)
        webhooks[index] = nextRecord
      } else {
        webhooks.unshift(nextRecord)
      }

      await fulfillJson(route, 200, JSON.stringify(nextRecord))
      return
    }

    if (method === 'DELETE') {
      if (webhookId) {
        const next = webhooks.filter(item => item.id !== webhookId)
        webhooks.splice(0, webhooks.length, ...next)
      }

      await fulfillJson(route, 200, '[]')
      return
    }

    await route.fallback()
  })

  await page.route(
    '**/rest/v1/rpc/get_webhook_dead_letters',
    async route => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillJson(route, 200, '{}')
        return
      }

      await fulfillJson(route, 200, JSON.stringify(deadLetters))
    }
  )

  await page.route(
    '**/rest/v1/rpc/retry_webhook_dead_letter',
    async route => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillJson(route, 200, '{}')
        return
      }

      const payload = JSON.parse(route.request().postData() || '{}')
      deadLetters = deadLetters.filter(
        item => item.id !== payload.p_delivery_id
      )

      await fulfillJson(route, 200, JSON.stringify('pending'))
    }
  )
}
