import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Trash2,
  Webhook,
} from 'lucide-react'
import { operationsService } from '@/services/supabase/operationsService'
import { useToastStore } from '@/stores/toastStore'
import { AnalyticsExport, OrganizationWebhook, WebhookDeadLetter } from '@/types'
import {
  buildWebhookFormState,
  defaultWebhookForm,
  formatDateTime,
  NormalizedWebhookFormInput,
  parseWebhookForm,
  WebhookFormState,
} from './operationsUtils'

interface OperationsSectionProps {
  organizationId: string
}

type CreateWebhookPayload = NormalizedWebhookFormInput & {
  secret: string
}

export const OperationsSection = ({
  organizationId,
}: OperationsSectionProps) => {
  const queryClient = useQueryClient()
  const addToast = useToastStore(state => state.addToast)
  const [lookbackDays, setLookbackDays] = useState('30')
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null)
  const [retryingDeliveryIds, setRetryingDeliveryIds] = useState<string[]>([])
  const [webhookForm, setWebhookForm] =
    useState<WebhookFormState>(defaultWebhookForm)

  const { data: exports = [] } = useQuery({
    queryKey: ['analytics-exports', organizationId],
    queryFn: () => operationsService.getAnalyticsExports(organizationId),
    enabled: Boolean(organizationId),
  })

  const { data: webhooks = [] } = useQuery({
    queryKey: ['organization-webhooks', organizationId],
    queryFn: () => operationsService.getWebhooks(organizationId),
    enabled: Boolean(organizationId),
  })

  const { data: deadLetters = [] } = useQuery({
    queryKey: ['webhook-dead-letters', organizationId],
    queryFn: () => operationsService.getWebhookDeadLetters(organizationId),
    enabled: Boolean(organizationId),
  })

  const requestExportMutation = useMutation({
    mutationFn: () =>
      operationsService.requestAnalyticsExport(organizationId, {
        lookbackDays: Number(lookbackDays),
      }),
    onSuccess: exportId => {
      queryClient.invalidateQueries({
        queryKey: ['analytics-exports', organizationId],
      })
      addToast({
        title: 'Export solicitado',
        description: `Export ${exportId.slice(0, 8)} entrou na fila.`,
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao solicitar export',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const createWebhookMutation = useMutation({
    mutationFn: (input: CreateWebhookPayload) =>
      operationsService.createWebhook(organizationId, input),
    onSuccess: () => {
      setEditingWebhookId(null)
      setWebhookForm(defaultWebhookForm)
      queryClient.invalidateQueries({
        queryKey: ['organization-webhooks', organizationId],
      })
      addToast({
        title: 'Webhook criado',
        description: 'Endpoint outbound configurado com sucesso.',
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao criar webhook',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const saveWebhookMutation = useMutation({
    mutationFn: (input: {
      webhookId: string
      config: NormalizedWebhookFormInput
    }) =>
      operationsService.updateWebhook(
        organizationId,
        input.webhookId,
        input.config
      ),
    onSuccess: () => {
      setEditingWebhookId(null)
      setWebhookForm(defaultWebhookForm)
      queryClient.invalidateQueries({
        queryKey: ['organization-webhooks', organizationId],
      })
      addToast({
        title: 'Webhook salvo',
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao salvar webhook',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const toggleWebhookStatusMutation = useMutation({
    mutationFn: (input: {
      webhookId: string
      status: OrganizationWebhook['status']
    }) =>
      operationsService.updateWebhook(organizationId, input.webhookId, {
        status: input.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-webhooks', organizationId],
      })
      addToast({
        title: 'Status do webhook atualizado',
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao atualizar webhook',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const deleteWebhookMutation = useMutation({
    mutationFn: (webhookId: string) =>
      operationsService.deleteWebhook(organizationId, webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-webhooks', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['webhook-dead-letters', organizationId],
      })
      addToast({
        title: 'Webhook removido',
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao remover webhook',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const retryDeadLetterMutation = useMutation({
    mutationFn: (deliveryId: string) =>
      operationsService.retryDeadLetterWebhook(organizationId, deliveryId),
    onMutate: deliveryId => {
      setRetryingDeliveryIds(current => [...current, deliveryId])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['webhook-dead-letters', organizationId],
      })
      addToast({
        title: 'Delivery reenfileirada',
        description: 'A entrega voltou para a fila de processamento.',
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao reenfileirar delivery',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
    onSettled: (_data, _error, deliveryId) => {
      setRetryingDeliveryIds(current =>
        current.filter(currentId => currentId !== deliveryId)
      )
    },
  })

  const handleExportRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const days = Number(lookbackDays)
    if (!Number.isFinite(days) || days <= 0 || days > 365) {
      addToast({
        title: 'Janela invalida',
        description: 'Informe um numero de dias entre 1 e 365.',
        variant: 'error',
      })
      return
    }

    requestExportMutation.mutate()
  }

  const handleWebhookSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let parsed: NormalizedWebhookFormInput
    try {
      parsed = parseWebhookForm(webhookForm, {
        requireSecret: !editingWebhookId,
      })
    } catch (error) {
      addToast({
        title: 'Configuracao invalida',
        description:
          error instanceof Error ? error.message : 'Revise os campos.',
        variant: 'error',
      })
      return
    }

    if (editingWebhookId) {
      saveWebhookMutation.mutate({ webhookId: editingWebhookId, config: parsed })
      return
    }

    createWebhookMutation.mutate({
      ...parsed,
      secret: parsed.secret!,
    })
  }

  const startWebhookEdit = (webhook: OrganizationWebhook) => {
    setEditingWebhookId(webhook.id)
    setWebhookForm(buildWebhookFormState(webhook))
  }

  const cancelWebhookEdit = () => {
    setEditingWebhookId(null)
    setWebhookForm(defaultWebhookForm)
  }

  const isSavingWebhook =
    createWebhookMutation.isPending || saveWebhookMutation.isPending

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl">Analytics Exports</h2>
            <p className="mt-2 text-sm text-white/70">
              Solicite exports assincronos e acompanhe a fila de geracao.
            </p>
          </div>
          <Download className="text-[color:var(--theme-accent)]" size={22} />
        </div>

        <form onSubmit={handleExportRequest} className="mt-5 flex gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={lookbackDays}
            onChange={event => setLookbackDays(event.target.value)}
            placeholder="30"
            className="w-28 rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <button
            type="submit"
            disabled={requestExportMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-accent)] px-5 py-2 font-semibold text-slate-900 disabled:opacity-60"
          >
            <Download size={16} />
            Solicitar CSV
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {(exports as AnalyticsExport[]).length === 0 && (
            <p className="text-sm text-white/65">Nenhum export solicitado.</p>
          )}
          {(exports as AnalyticsExport[]).map(item => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/15 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-white">
                  {item.format.toUpperCase()} | {item.status}
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
              <p className="mt-2 text-white/70">
                janela:{' '}
                {String((item.filters?.lookback_days as number | undefined) ?? '-')}
                {' '}dias | linhas: {item.row_count ?? '-'}
              </p>
              {item.download_url && (
                <a
                  href={item.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-cyan-200"
                >
                  <ExternalLink size={14} />
                  Abrir download
                </a>
              )}
              {item.error_message && (
                <p className="mt-2 text-red-200">{item.error_message}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl">Outbound Webhooks</h2>
            <p className="mt-2 text-sm text-white/70">
              Cadastre endpoints e monitore deliveries em dead-letter.
            </p>
          </div>
          <Webhook className="text-[color:var(--theme-accent)]" size={22} />
        </div>

        <form onSubmit={handleWebhookSubmit} className="mt-5 grid gap-3">
          <input
            value={webhookForm.name}
            onChange={event =>
              setWebhookForm(prev => ({ ...prev, name: event.target.value }))
            }
            placeholder="Nome do webhook"
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <input
            value={webhookForm.targetUrl}
            onChange={event =>
              setWebhookForm(prev => ({
                ...prev,
                targetUrl: event.target.value,
              }))
            }
            placeholder="https://api.exemplo.com/webhooks/orders"
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <input
            value={webhookForm.eventTypes}
            onChange={event =>
              setWebhookForm(prev => ({
                ...prev,
                eventTypes: event.target.value,
              }))
            }
            placeholder="checkout.completed, order.created"
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <input
            type="password"
            value={webhookForm.secret}
            onChange={event =>
              setWebhookForm(prev => ({ ...prev, secret: event.target.value }))
            }
            placeholder={
              editingWebhookId
                ? 'Novo segredo HMAC (opcional)'
                : 'Segredo HMAC'
            }
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          {editingWebhookId && (
            <p className="-mt-1 text-xs text-white/60">
              Deixe em branco para manter o segredo atual.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1000}
              max={60000}
              value={webhookForm.timeoutMs}
              onChange={event =>
                setWebhookForm(prev => ({
                  ...prev,
                  timeoutMs: event.target.value,
                }))
              }
              placeholder="10000"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
            <input
              type="number"
              min={0}
              max={20}
              value={webhookForm.maxRetries}
              onChange={event =>
                setWebhookForm(prev => ({
                  ...prev,
                  maxRetries: event.target.value,
                }))
              }
              placeholder="8"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
          </div>
          <textarea
            value={webhookForm.headersJson}
            onChange={event =>
              setWebhookForm(prev => ({
                ...prev,
                headersJson: event.target.value,
              }))
            }
            rows={4}
            placeholder='{"x-source":"nexus"}'
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 font-mono text-sm text-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isSavingWebhook}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--theme-accent)] px-5 py-2 font-semibold text-slate-900 disabled:opacity-60"
            >
              <Webhook size={16} />
              {editingWebhookId ? 'Salvar webhook' : 'Criar webhook'}
            </button>
            {editingWebhookId && (
              <button
                type="button"
                onClick={cancelWebhookEdit}
                className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/85"
              >
                Cancelar edicao
              </button>
            )}
          </div>
        </form>

        <div className="mt-5 space-y-3">
          {(webhooks as OrganizationWebhook[]).length === 0 && (
            <p className="text-sm text-white/65">Nenhum webhook cadastrado.</p>
          )}
          {(webhooks as OrganizationWebhook[]).map(webhook => {
            const nextStatus = webhook.status === 'active' ? 'paused' : 'active'
            return (
              <div
                key={webhook.id}
                className="rounded-2xl border border-white/15 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{webhook.name}</p>
                    <p className="text-white/65">{webhook.target_url}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                    {webhook.status}
                  </p>
                </div>
                <p className="mt-2 text-white/70">
                  eventos:{' '}
                  {webhook.event_types.length
                    ? webhook.event_types.join(', ')
                    : 'todos'}
                </p>
                <p className="mt-1 text-white/70">
                  timeout {webhook.timeout_ms}ms | retries {webhook.max_retries}
                </p>
                {editingWebhookId === webhook.id && (
                  <p className="mt-1 text-amber-200">Editando este webhook.</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => startWebhookEdit(webhook)}
                    disabled={isSavingWebhook}
                    className="rounded-full border border-cyan-300/30 px-4 py-2 text-xs uppercase tracking-[0.14em] text-cyan-200 disabled:opacity-60"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      toggleWebhookStatusMutation.mutate({
                        webhookId: webhook.id,
                        status: nextStatus,
                      })
                    }
                    disabled={toggleWebhookStatusMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white/85 disabled:opacity-60"
                  >
                    {webhook.status === 'active' ? (
                      <PauseCircle size={14} />
                    ) : (
                      <PlayCircle size={14} />
                    )}
                    {webhook.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                    disabled={deleteWebhookMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-red-300/40 px-4 py-2 text-xs uppercase tracking-[0.14em] text-red-200 disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 p-4">
          <h3 className="text-lg text-white">Dead-letter queue</h3>
          <div className="mt-3 space-y-3">
            {(deadLetters as WebhookDeadLetter[]).length === 0 && (
              <p className="text-sm text-white/65">
                Nenhuma delivery em dead-letter.
              </p>
            )}
            {(deadLetters as WebhookDeadLetter[]).map(item => {
              const isRetryingItem = retryingDeliveryIds.includes(item.id)

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{item.event_type}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-white/60">
                      {formatDateTime(item.dead_lettered_at || item.created_at)}
                    </p>
                  </div>
                  <p className="mt-1 text-white/70">
                    tentativas {item.attempt_count}/{item.max_attempts}
                  </p>
                  {item.last_error && (
                    <p className="mt-1 text-red-200">{item.last_error}</p>
                  )}
                  <button
                    onClick={() => retryDeadLetterMutation.mutate(item.id)}
                    disabled={isRetryingItem}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white/85 disabled:opacity-60"
                  >
                    <RotateCcw size={14} />
                    {isRetryingItem ? 'Reenfileirando...' : 'Reenfileirar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
