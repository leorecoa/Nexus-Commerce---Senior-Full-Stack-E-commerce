import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  },
}))

import { operationsService } from '@/services/supabase/operationsService'

const WEBHOOK_PUBLIC_COLUMNS =
  'id, organization_id, name, target_url, event_types, status, timeout_ms, max_retries, headers, created_by, created_at, updated_at'

describe('operationsService', () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset()
    supabaseMocks.rpc.mockReset()
    vi.useRealTimers()
  })

  it('loads analytics exports ordered by most recent first', async () => {
    const records = [{ id: 'exp-1', status: 'pending' }]
    const orderMock = vi.fn().mockReturnValue({ data: records, error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    supabaseMocks.from.mockReturnValue({
      select: selectMock,
    })

    const result = await operationsService.getAnalyticsExports('org-1')

    expect(supabaseMocks.from).toHaveBeenCalledWith('analytics_exports')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toEqual(records)
  })

  it('requests analytics export using a clamped lookback window', async () => {
    supabaseMocks.rpc.mockReturnValue({ data: 'export-123', error: null })

    const result = await operationsService.requestAnalyticsExport('org-1', {
      lookbackDays: 999,
    })

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('request_analytics_export', {
      p_org_id: 'org-1',
      p_filters: { lookback_days: 365 },
      p_format: 'csv',
    })
    expect(result).toBe('export-123')
  })

  it('creates a webhook with trimmed values and default limits', async () => {
    const singleMock = vi.fn().mockReturnValue({
      data: { id: 'wh-1' },
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })

    supabaseMocks.from.mockReturnValue({
      insert: insertMock,
    })

    await operationsService.createWebhook('org-1', {
      name: '  Orders hook  ',
      target_url: ' https://example.com/webhooks/orders ',
      secret: '  super-secret  ',
    })

    expect(supabaseMocks.from).toHaveBeenCalledWith('organization_webhooks')
    expect(insertMock).toHaveBeenCalledWith({
      organization_id: 'org-1',
      name: 'Orders hook',
      target_url: 'https://example.com/webhooks/orders',
      event_types: [],
      secret: 'super-secret',
      timeout_ms: 10000,
      max_retries: 8,
      headers: {},
    })
    expect(selectMock).toHaveBeenCalledWith(WEBHOOK_PUBLIC_COLUMNS)
  })

  it('updates webhook fields with a sanitized payload', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-02T12:00:00.000Z'))

    const singleMock = vi.fn().mockReturnValue({
      data: { id: 'wh-1' },
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqOrgMock = vi.fn().mockReturnValue({ select: selectMock })
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock })

    supabaseMocks.from.mockReturnValue({
      update: updateMock,
    })

    await operationsService.updateWebhook('org-1', 'wh-1', {
      name: '  Updated name  ',
      target_url: ' https://example.com/new ',
      event_types: ['checkout.completed'],
      secret: '  rotated-secret ',
      timeout_ms: 15000,
      max_retries: 4,
      headers: { 'x-source': 'nexus' },
      status: 'paused',
    })

    expect(supabaseMocks.from).toHaveBeenCalledWith('organization_webhooks')
    expect(updateMock).toHaveBeenCalledWith({
      updated_at: '2026-03-02T12:00:00.000Z',
      name: 'Updated name',
      target_url: 'https://example.com/new',
      event_types: ['checkout.completed'],
      secret: 'rotated-secret',
      timeout_ms: 15000,
      max_retries: 4,
      headers: { 'x-source': 'nexus' },
      status: 'paused',
    })
    expect(eqIdMock).toHaveBeenCalledWith('id', 'wh-1')
    expect(eqOrgMock).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(selectMock).toHaveBeenCalledWith(WEBHOOK_PUBLIC_COLUMNS)
  })

  it('loads dead-letter deliveries from the rpc helper', async () => {
    const deadLetters = [{ id: 'dlq-1', event_type: 'checkout.completed' }]
    supabaseMocks.rpc.mockReturnValue({ data: deadLetters, error: null })

    const result = await operationsService.getWebhookDeadLetters('org-1')

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('get_webhook_dead_letters', {
      p_org_id: 'org-1',
      p_limit: 25,
    })
    expect(result).toEqual(deadLetters)
  })

  it('requeues a dead-letter delivery through the rpc helper', async () => {
    supabaseMocks.rpc.mockReturnValue({ data: 'pending', error: null })

    const result = await operationsService.retryDeadLetterWebhook(
      'org-1',
      'dlq-1'
    )

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('retry_webhook_dead_letter', {
      p_org_id: 'org-1',
      p_delivery_id: 'dlq-1',
    })
    expect(result).toBe('pending')
  })
})
