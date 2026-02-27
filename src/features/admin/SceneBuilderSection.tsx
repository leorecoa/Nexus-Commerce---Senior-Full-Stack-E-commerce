import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { sceneService } from '@/services/supabase/sceneService'
import { organizationService } from '@/services/supabase/organizationService'
import { Product, StoryScene } from '@/types'
import { useToastStore } from '@/stores/toastStore'

interface SceneBuilderSectionProps {
  organizationId: string | null
  products: Product[]
}

const sceneTypes: StoryScene['scene_type'][] = ['hero', 'feature', 'proof', 'cta']

export const SceneBuilderSection = ({ organizationId, products }: SceneBuilderSectionProps) => {
  const queryClient = useQueryClient()
  const addToast = useToastStore(state => state.addToast)
  const [isStoreReady, setIsStoreReady] = useState(false)
  const [sceneType, setSceneType] = useState<StoryScene['scene_type']>('feature')
  const [position, setPosition] = useState(1)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [productId, setProductId] = useState<string>('')

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
          queryClient.invalidateQueries({ queryKey: ['story-scenes-admin', organizationId] })
          queryClient.invalidateQueries({ queryKey: ['story-scenes-public', organizationId] })
        }
      } catch (error) {
        if (!cancelled) {
          setIsStoreReady(false)
          addToast({
            title: 'Falha ao preparar store',
            description: error instanceof Error ? error.message : 'Tente novamente.',
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
      queryClient.invalidateQueries({ queryKey: ['story-scenes-admin', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['story-scenes-public', organizationId] })
    },
    onError: error => {
      addToast({
        title: 'Erro ao criar cena',
        description: error instanceof Error ? error.message : 'Tente novamente.',
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
      queryClient.invalidateQueries({ queryKey: ['story-scenes-admin', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['story-scenes-public', organizationId] })
    },
    onError: error => {
      addToast({
        title: 'Erro ao atualizar cena',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (sceneId: string) => sceneService.delete(sceneId, organizationId!),
    onSuccess: () => {
      addToast({
        title: 'Cena removida',
        description: 'A cena foi excluída do builder.',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['story-scenes-admin', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['story-scenes-public', organizationId] })
    },
    onError: error => {
      addToast({
        title: 'Erro ao excluir cena',
        description: error instanceof Error ? error.message : 'Tente novamente.',
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
      <p className="mb-6 mt-2 text-sm text-white/65">Configure storytelling da home sem alterar código.</p>

      {!isStoreReady && <p className="mb-4 text-sm text-white/70">Preparando store padrão para esta organização...</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={sceneType}
          onChange={event => setSceneType(event.target.value as StoryScene['scene_type'])}
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
          <option value="" className="bg-slate-900">Sem produto vinculado</option>
          {products.map(product => (
            <option key={product.id} value={product.id} className="bg-slate-900">
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
        {!isLoading && scenes.length === 0 && isStoreReady && <p className="text-white/65">Nenhuma cena configurada ainda.</p>}

        {scenes.map(scene => (
          <div key={scene.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{scene.scene_type} #{scene.position}</p>
              <h3 className="text-xl text-white">{String(scene.content.title || 'Untitled scene')}</h3>
              <p className="text-sm text-white/65">{String(scene.content.subtitle || '')}</p>
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
