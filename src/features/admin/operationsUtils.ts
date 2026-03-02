import { OrganizationWebhook } from '@/types'

export interface WebhookFormState {
  name: string
  targetUrl: string
  eventTypes: string
  secret: string
  timeoutMs: string
  maxRetries: string
  headersJson: string
}

export interface NormalizedWebhookFormInput {
  name: string
  target_url: string
  event_types: string[]
  secret?: string
  timeout_ms: number
  max_retries: number
  headers: Record<string, string>
}

export const defaultWebhookForm: WebhookFormState = {
  name: '',
  targetUrl: '',
  eventTypes: '',
  secret: '',
  timeoutMs: '10000',
  maxRetries: '8',
  headersJson: '{}',
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const formatEventTypes = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

export const parseHeadersJson = (value: string) => {
  const parsed = JSON.parse(value || '{}')

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Headers precisam ser um objeto JSON.')
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, currentValue]) => [key, String(currentValue)])
  )
}

export const parseWebhookForm = (
  form: WebhookFormState,
  options: {
    requireSecret?: boolean
  } = {}
): NormalizedWebhookFormInput => {
  const name = form.name.trim()
  const targetUrl = form.targetUrl.trim()
  const secret = form.secret.trim()
  const requireSecret = options.requireSecret ?? true

  if (!name || !targetUrl) {
    throw new Error('Preencha nome e URL.')
  }

  try {
    new URL(targetUrl)
  } catch {
    throw new Error('URL invalida. Use um endpoint absoluto com http ou https.')
  }

  if (requireSecret && !secret) {
    throw new Error('Secret obrigatorio.')
  }

  const timeoutMs = Number(form.timeoutMs)
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error('Timeout invalido. Use um valor entre 1000 e 60000 ms.')
  }

  const maxRetries = Number(form.maxRetries)
  if (!Number.isFinite(maxRetries) || maxRetries < 0 || maxRetries > 20) {
    throw new Error('Retries invalidos. Use um valor entre 0 e 20.')
  }

  return {
    name,
    target_url: targetUrl,
    event_types: formatEventTypes(form.eventTypes),
    ...(secret ? { secret } : {}),
    timeout_ms: timeoutMs,
    max_retries: maxRetries,
    headers: parseHeadersJson(form.headersJson),
  }
}

export const buildWebhookFormState = (
  webhook: OrganizationWebhook
): WebhookFormState => ({
  name: webhook.name,
  targetUrl: webhook.target_url,
  eventTypes: webhook.event_types.join(', '),
  secret: '',
  timeoutMs: String(webhook.timeout_ms),
  maxRetries: String(webhook.max_retries),
  headersJson: JSON.stringify(webhook.headers ?? {}, null, 2),
})
