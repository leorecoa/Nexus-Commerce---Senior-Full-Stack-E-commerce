import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Plus, Sparkles, Trash2 } from 'lucide-react'
import { sceneService } from '@/services/supabase/sceneService'
import { organizationService } from '@/services/supabase/organizationService'
import { Product, StoryScene } from '@/types'
import { useToastStore } from '@/stores/toastStore'

interface SceneBuilderSectionProps {
  organizationId: string | null
  products: Product[]
}

const sceneTypes: StoryScene['scene_type'][] = [
  'hero',
  'feature',
  'proof',
  'cta',
]

export const SceneBuilderSection = ({
  organizationId,
  products,
}: SceneBuilderSectionProps) => {
  const queryClient = useQueryClient()
  const addToast = useToastStore(state => state.addToast)
  const [isStoreReady, setIsStoreReady] = useState(false)
  const [sceneType, setSceneType] =
    useState<StoryScene['scene_type']>('feature')
  const [position, setPosition] = useState(1)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [productId, setProductId] = useState<string>('')
  const [templateKey, setTemplateKey] = useState('')
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const ensureStore = async () => {
      if (!organizationId) {
        setIsStoreReady(false)
        return
      }

      try {
        await organizationService.ensureDefaultStore(organizationId)
        if (!cancelled) {
          setIsStoreReady(true)
          queryClient.invalidateQueries({
            queryKey: ['story-scenes-admin', organizationId],
          })
          queryClient.invalidateQueries({
            queryKey: ['story-scenes-public', organizationId],
          })
        }
      } catch (error) {
        if (!cancelled) {
          setIsStoreReady(false)
          addToast({
            title: 'Falha ao preparar store',
            description:
              error instanceof Error ? error.message : 'Tente novamente.',
            variant: 'error',
          })
          console.error(error)
        }
      }
    }

    ensureStore()

    return () => {
      cancelled = true
    }
  }, [organizationId, queryClient, addToast])

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['story-scenes-admin', organizationId],
    queryFn: () => sceneService.getByOrganization(organizationId!),
    enabled: Boolean(organizationId && isStoreReady),
    retry: false,
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['campaign-templates', organizationId],
    queryFn: () => sceneService.getTemplates(organizationId!),
    enabled: Boolean(organizationId && isStoreReady),
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['scene-template-versions', organizationId],
    queryFn: () => sceneService.getTemplateVersions(organizationId!),
    enabled: Boolean(organizationId && isStoreReady),
  })

  useEffect(() => {
    if (!templateKey && templates.length > 0) {
      setTemplateKey(templates[0].key)
    }
  }, [templates, templateKey])

  const currentVersion = useMemo(() => {
    if (!scenes.length) return 0
    return Math.max(...scenes.map(scene => Number(scene.template_version || 1)))
  }, [scenes])

  const createMutation = useMutation({
    mutationFn: () =>
      sceneService.create(organizationId!, {
        scene_type: sceneType,
        position,
        product_id: productId || null,
        is_active: true,
        content: {
          title,
          subtitle,
        },
      }),
    onSuccess: () => {
      setTitle('')
      setSubtitle('')
      setProductId('')
      addToast({
        title: 'Cena criada',
        description: 'A nova cena foi adicionada ao storytelling.',
        variant: 'success',
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-admin', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-public', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['scene-template-versions', organizationId],
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao criar cena',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (scene: StoryScene) =>
      sceneService.update(scene.id, organizationId!, {
        is_active: !scene.is_active,
      }),
    onSuccess: () => {
      addToast({
        title: 'Cena atualizada',
        description: 'Status da cena alterado com sucesso.',
        variant: 'success',
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-admin', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-public', organizationId],
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao atualizar cena',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (sceneId: string) =>
      sceneService.delete(sceneId, organizationId!),
    onSuccess: () => {
      addToast({
        title: 'Cena removida',
        description: 'A cena foi excluída do builder.',
        variant: 'success',
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-admin', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-public', organizationId],
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao excluir cena',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: () =>
      sceneService.applyTemplate(organizationId!, templateKey, productId || ''),
    onSuccess: version => {
      addToast({
        title: 'Template aplicado',
        description: `Novo template_version: v${version}`,
        variant: 'success',
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-admin', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-public', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['scene-template-versions', organizationId],
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao aplicar template',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: () =>
      sceneService.rollbackToVersion(organizationId!, rollbackVersion!),
    onSuccess: version => {
      addToast({
        title: 'Rollback concluído',
        description: `Story scenes restauradas para v${version}.`,
        variant: 'success',
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-admin', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['story-scenes-public', organizationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['scene-template-versions', organizationId],
      })
    },
    onError: error => {
      addToast({
        title: 'Erro no rollback',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  if (!organizationId) {
    return (
      <section className="glass-panel mt-12 rounded-3xl p-6 text-white/80">
        Selecione uma organização para editar as cenas da landing.
      </section>
    )
  }

  return (
    <section className="glass-panel mt-12 rounded-3xl p-6">
      <h2 className="text-4xl text-white">Scene Builder</h2>
      <p className="mb-6 mt-2 text-sm text-white/65">
        Configure storytelling da home sem alterar código.
      </p>

      {!isStoreReady && (
        <p className="mb-4 text-sm text-white/70">
          Preparando store padrão para esta organização...
        </p>
      )}

      <div className="mb-6 rounded-2xl border border-white/15 bg-slate-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg text-white">Templates de Campanha</h3>
          <p className="text-xs uppercase tracking-[0.16em] text-white/60">
            version atual: v{currentVersion || 1}
          </p>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <select
            value={templateKey}
            onChange={event => setTemplateKey(event.target.value)}
            className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white md:col-span-2"
          >
            {templates.length === 0 && (
              <option value="" className="bg-slate-900">
                Sem templates disponíveis
              </option>
            )}
            {templates.map(template => (
              <option
                key={template.id}
                value={template.key}
                className="bg-slate-900"
              >
                {template.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => applyTemplateMutation.mutate()}
            disabled={
              !templateKey || applyTemplateMutation.isPending || !isStoreReady
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--theme-accent)] px-4 py-2 font-semibold text-slate-900 disabled:opacity-60"
          >
            <Sparkles size={15} />
            Aplicar template
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={rollbackVersion ?? ''}
            onChange={event =>
              setRollbackVersion(
                event.target.value ? Number(event.target.value) : null
              )
            }
            className="min-w-52 rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          >
            <option value="" className="bg-slate-900">
              Selecione versão para rollback
            </option>
            {versions.map(version => (
              <option
                key={version.id}
                value={version.template_version}
                className="bg-slate-900"
              >
                v{version.template_version} (
                {version.source_template_key || 'manual'})
              </option>
            ))}
          </select>
          <button
            onClick={() => rollbackMutation.mutate()}
            disabled={
              !rollbackVersion || rollbackMutation.isPending || !isStoreReady
            }
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            <History size={15} />
            Rollback
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={sceneType}
          onChange={event =>
            setSceneType(event.target.value as StoryScene['scene_type'])
          }
          className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
        >
          {sceneTypes.map(type => (
            <option key={type} value={type} className="bg-slate-900">
              {type}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={position}
          min={1}
          onChange={event => setPosition(Number(event.target.value || 1))}
          placeholder="Position"
          className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
        />

        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Title"
          className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
        />

        <input
          value={subtitle}
          onChange={event => setSubtitle(event.target.value)}
          placeholder="Subtitle"
          className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
        />

        <select
          value={productId}
          onChange={event => setProductId(event.target.value)}
          className="rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white md:col-span-2"
        >
          <option value="" className="bg-slate-900">
            Sem produto vinculado
          </option>
          {products.map(product => (
            <option
              key={product.id}
              value={product.id}
              className="bg-slate-900"
            >
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending || !title.trim() || !isStoreReady}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-accent)] px-5 py-2 font-semibold text-slate-900 disabled:opacity-60"
      >
        <Plus size={16} />
        Add Scene
      </button>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-white/65">Carregando cenas...</p>}
        {!isLoading && scenes.length === 0 && isStoreReady && (
          <p className="text-white/65">Nenhuma cena configurada ainda.</p>
        )}

        {scenes.map(scene => (
          <div
            key={scene.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 p-4"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                {scene.scene_type} #{scene.position} | v{scene.template_version}
              </p>
              <h3 className="text-xl text-white">
                {String(scene.content.title || 'Untitled scene')}
              </h3>
              <p className="text-sm text-white/65">
                {String(scene.content.subtitle || '')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMutation.mutate(scene)}
                className="rounded-full border border-white/25 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/80"
              >
                {scene.is_active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => deleteMutation.mutate(scene.id)}
                className="rounded-full border border-red-300/40 px-4 py-2 text-xs uppercase tracking-[0.16em] text-red-200"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
