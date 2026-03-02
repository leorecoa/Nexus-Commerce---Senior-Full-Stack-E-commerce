import { supabase } from '@/lib/supabase'
import {
  AnalyticsExport,
  OrganizationWebhook,
  WebhookDeadLetter,
} from '@/types'

interface RequestExportInput {
  lookbackDays?: number
}

interface CreateWebhookInput {
  name: string
  target_url: string
  event_types?: string[]
  secret: string
  timeout_ms?: number
  max_retries?: number
  headers?: Record<string, string>
}

type UpdateWebhookInput = Partial<CreateWebhookInput> & {
  status?: OrganizationWebhook['status']
}

export const operationsService = {
  async getAnalyticsExports(organizationId: string) {
    const { data, error } = await supabase
      .from('analytics_exports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as AnalyticsExport[]
  },

  async requestAnalyticsExport(
    organizationId: string,
    input: RequestExportInput = {}
  ) {
    const days = Math.max(1, Math.min(365, Number(input.lookbackDays ?? 30)))

    const { data, error } = await supabase.rpc('request_analytics_export', {
      p_org_id: organizationId,
      p_filters: { lookback_days: days },
      p_format: 'csv',
    })

    if (error) throw error
    return data as string
  },

  async getWebhooks(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as OrganizationWebhook[]
  },

  async createWebhook(organizationId: string, input: CreateWebhookInput) {
    const { data, error } = await supabase
      .from('organization_webhooks')
      .insert({
        organization_id: organizationId,
        name: input.name.trim(),
        target_url: input.target_url.trim(),
        event_types: input.event_types ?? [],
        secret: input.secret.trim(),
        timeout_ms: input.timeout_ms ?? 10_000,
        max_retries: input.max_retries ?? 8,
        headers: input.headers ?? {},
      })
      .select('*')
      .single()

    if (error) throw error
    return data as OrganizationWebhook
  },

  async updateWebhook(
    organizationId: string,
    webhookId: string,
    input: UpdateWebhookInput
  ) {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.name !== undefined) {
      payload.name = input.name.trim()
    }

    if (input.target_url !== undefined) {
      payload.target_url = input.target_url.trim()
    }

    if (input.event_types !== undefined) {
      payload.event_types = input.event_types
    }

    if (input.secret !== undefined) {
      payload.secret = input.secret.trim()
    }

    if (input.timeout_ms !== undefined) {
      payload.timeout_ms = input.timeout_ms
    }

    if (input.max_retries !== undefined) {
      payload.max_retries = input.max_retries
    }

    if (input.headers !== undefined) {
      payload.headers = input.headers
    }

    if (input.status !== undefined) {
      payload.status = input.status
    }

    const { data, error } = await supabase
      .from('organization_webhooks')
      .update(payload)
      .eq('id', webhookId)
      .eq('organization_id', organizationId)
      .select('*')
      .single()

    if (error) throw error
    return data as OrganizationWebhook
  },

  async deleteWebhook(organizationId: string, webhookId: string) {
    const { error } = await supabase
      .from('organization_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('organization_id', organizationId)

    if (error) throw error
  },

  async getWebhookDeadLetters(organizationId: string) {
    const { data, error } = await supabase.rpc('get_webhook_dead_letters', {
      p_org_id: organizationId,
      p_limit: 25,
    })

    if (error) throw error
    return (data ?? []) as WebhookDeadLetter[]
  },

  async retryDeadLetterWebhook(organizationId: string, deliveryId: string) {
    const { data, error } = await supabase.rpc('retry_webhook_dead_letter', {
      p_org_id: organizationId,
      p_delivery_id: deliveryId,
    })

    if (error) throw error
    return data as string
  },
}
