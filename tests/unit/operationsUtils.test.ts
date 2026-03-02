import { describe, expect, it } from 'vitest'
import {
  buildWebhookFormState,
  formatEventTypes,
  parseHeadersJson,
  parseWebhookForm,
} from '@/features/admin/operationsUtils'

describe('operationsUtils', () => {
  it('formats event types by trimming and removing empty entries', () => {
    expect(formatEventTypes(' checkout.completed, , order.created  ')).toEqual([
      'checkout.completed',
      'order.created',
    ])
  })

  it('parses headers json and stringifies values', () => {
    expect(parseHeadersJson('{"x-source":"nexus","x-retry":3}')).toEqual({
      'x-source': 'nexus',
      'x-retry': '3',
    })
  })

  it('rejects non-object headers json', () => {
    expect(() => parseHeadersJson('["invalid"]')).toThrow(
      'Headers precisam ser um objeto JSON.'
    )
  })

  it('parses a valid webhook form into a normalized payload', () => {
    expect(
      parseWebhookForm({
        name: ' Orders Hook ',
        targetUrl: ' https://example.com/webhooks/orders ',
        eventTypes: 'checkout.completed, order.created',
        secret: ' super-secret ',
        timeoutMs: '15000',
        maxRetries: '4',
        headersJson: '{"x-source":"nexus"}',
      })
    ).toEqual({
      name: 'Orders Hook',
      target_url: 'https://example.com/webhooks/orders',
      event_types: ['checkout.completed', 'order.created'],
      secret: 'super-secret',
      timeout_ms: 15000,
      max_retries: 4,
      headers: { 'x-source': 'nexus' },
    })
  })

  it('allows editing a webhook without rotating the secret', () => {
    expect(
      parseWebhookForm(
        {
          name: ' Orders Hook ',
          targetUrl: ' https://example.com/webhooks/orders ',
          eventTypes: 'checkout.completed',
          secret: '   ',
          timeoutMs: '10000',
          maxRetries: '8',
          headersJson: '{}',
        },
        { requireSecret: false }
      )
    ).toEqual({
      name: 'Orders Hook',
      target_url: 'https://example.com/webhooks/orders',
      event_types: ['checkout.completed'],
      timeout_ms: 10000,
      max_retries: 8,
      headers: {},
    })
  })

  it('builds a form state from an existing webhook', () => {
    expect(
      buildWebhookFormState({
        id: 'wh-1',
        organization_id: 'org-1',
        name: 'Orders Hook',
        target_url: 'https://example.com/webhooks/orders',
        event_types: ['checkout.completed'],
        secret: 'super-secret',
        status: 'active',
        timeout_ms: 10000,
        max_retries: 8,
        headers: { 'x-source': 'nexus' },
        created_at: '',
        updated_at: '',
      })
    ).toEqual({
      name: 'Orders Hook',
      targetUrl: 'https://example.com/webhooks/orders',
      eventTypes: 'checkout.completed',
      secret: '',
      timeoutMs: '10000',
      maxRetries: '8',
      headersJson: '{\n  "x-source": "nexus"\n}',
    })
  })
})
