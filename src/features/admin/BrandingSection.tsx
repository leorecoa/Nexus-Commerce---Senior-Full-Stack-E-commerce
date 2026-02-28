import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Globe } from 'lucide-react'
import { brandingService } from '@/services/supabase/brandingService'
import { useToastStore } from '@/stores/toastStore'
import { OrganizationDomain } from '@/types'

interface BrandingSectionProps {
  organizationId: string
}

interface BrandingFormState {
  public_name: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
}

const defaultForm: BrandingFormState = {
  public_name: '',
  logo_url: '',
  favicon_url: '',
  primary_color: '',
  secondary_color: '',
  accent_color: '',
  font_family: '',
}

const sanitizeDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')

export const BrandingSection = ({ organizationId }: BrandingSectionProps) => {
  const queryClient = useQueryClient()
  const addToast = useToastStore(state => state.addToast)

  const [form, setForm] = useState<BrandingFormState>(defaultForm)
  const [isHydrated, setIsHydrated] = useState(false)
  const [domainInput, setDomainInput] = useState('')

  useEffect(() => {
    setIsHydrated(false)
    setForm(defaultForm)
    setDomainInput('')
  }, [organizationId])

  const { data: branding } = useQuery({
    queryKey: ['tenant-branding', organizationId],
    queryFn: () => brandingService.getByOrganization(organizationId),
    enabled: Boolean(organizationId),
  })

  const { data: domains = [] } = useQuery({
    queryKey: ['tenant-domains', organizationId],
    queryFn: () => brandingService.getDomainsByOrganization(organizationId),
    enabled: Boolean(organizationId),
  })

  useEffect(() => {
    if (isHydrated || !organizationId) {
      return
    }

    setForm({
      public_name: branding?.public_name ?? '',
      logo_url: branding?.logo_url ?? '',
      favicon_url: branding?.favicon_url ?? '',
      primary_color: branding?.primary_color ?? '',
      secondary_color: branding?.secondary_color ?? '',
      accent_color: branding?.accent_color ?? '',
      font_family: branding?.font_family ?? '',
    })
    setIsHydrated(true)
  }, [branding, isHydrated, organizationId])

  const saveBrandingMutation = useMutation({
    mutationFn: () =>
      brandingService.upsertByOrganization(organizationId, {
        public_name: form.public_name.trim() || null,
        logo_url: form.logo_url.trim() || null,
        favicon_url: form.favicon_url.trim() || null,
        primary_color: form.primary_color.trim() || null,
        secondary_color: form.secondary_color.trim() || null,
        accent_color: form.accent_color.trim() || null,
        font_family: form.font_family.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tenant-branding', organizationId],
      })
      addToast({ title: 'Branding atualizado', variant: 'success' })
    },
    onError: error => {
      addToast({
        title: 'Erro ao salvar branding',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const addDomainMutation = useMutation({
    mutationFn: () =>
      brandingService.addDomain(organizationId, sanitizeDomain(domainInput)),
    onSuccess: () => {
      setDomainInput('')
      queryClient.invalidateQueries({
        queryKey: ['tenant-domains', organizationId],
      })
      addToast({
        title: 'Dominio cadastrado',
        description:
          'Configure o DNS com o token de verificacao antes de publicar.',
        variant: 'success',
      })
    },
    onError: error => {
      addToast({
        title: 'Erro ao cadastrar dominio',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'error',
      })
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    saveBrandingMutation.mutate()
  }

  const handleAddDomain = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = sanitizeDomain(domainInput)
    if (!normalized || normalized.includes(' ')) {
      addToast({ title: 'Dominio invalido', variant: 'error' })
      return
    }
    addDomainMutation.mutate()
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="glass-panel rounded-3xl p-6">
        <h2 className="text-3xl">White-label Branding</h2>
        <p className="mt-2 text-sm text-white/70">
          Personalize identidade do tenant por organizacao.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
          <input
            value={form.public_name}
            onChange={event =>
              setForm(prev => ({ ...prev, public_name: event.target.value }))
            }
            placeholder="Nome publico"
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.logo_url}
              onChange={event =>
                setForm(prev => ({ ...prev, logo_url: event.target.value }))
              }
              placeholder="Logo URL"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
            <input
              value={form.favicon_url}
              onChange={event =>
                setForm(prev => ({ ...prev, favicon_url: event.target.value }))
              }
              placeholder="Favicon URL"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={form.primary_color}
              onChange={event =>
                setForm(prev => ({
                  ...prev,
                  primary_color: event.target.value,
                }))
              }
              placeholder="#0f172a"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
            <input
              value={form.secondary_color}
              onChange={event =>
                setForm(prev => ({
                  ...prev,
                  secondary_color: event.target.value,
                }))
              }
              placeholder="#1e293b"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
            <input
              value={form.accent_color}
              onChange={event =>
                setForm(prev => ({
                  ...prev,
                  accent_color: event.target.value,
                }))
              }
              placeholder="#22d3ee"
              className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
            />
          </div>
          <input
            value={form.font_family}
            onChange={event =>
              setForm(prev => ({ ...prev, font_family: event.target.value }))
            }
            placeholder="Font family (ex: Space Grotesk, sans-serif)"
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <button
            type="submit"
            disabled={saveBrandingMutation.isPending}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--theme-accent)] px-5 py-2 font-semibold text-slate-900 disabled:opacity-60"
          >
            <Save size={16} />
            Salvar Branding
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <h2 className="text-3xl">Dominios customizados</h2>
        <p className="mt-2 text-sm text-white/70">
          Vincule dominio e valide via DNS para ativar branding por host.
        </p>

        <form onSubmit={handleAddDomain} className="mt-5 flex gap-2">
          <input
            value={domainInput}
            onChange={event => setDomainInput(event.target.value)}
            placeholder="app.suaempresa.com"
            className="w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-white"
          />
          <button
            type="submit"
            disabled={addDomainMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            <Globe size={14} />
            Adicionar
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {(domains as OrganizationDomain[]).length === 0 && (
            <p className="text-sm text-white/65">Nenhum dominio cadastrado.</p>
          )}
          {(domains as OrganizationDomain[]).map(domain => (
            <div
              key={domain.id}
              className="rounded-2xl border border-white/15 p-3 text-sm"
            >
              <p className="font-medium text-white">{domain.domain}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/65">
                status: {domain.status}
              </p>
              <p className="mt-2 break-all text-xs text-white/70">
                token DNS: {domain.verification_token}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
