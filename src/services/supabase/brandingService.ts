import { supabase } from '@/lib/supabase'
import { OrganizationDomain, TenantBranding } from '@/types'

const isMissingRelationError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === 'PGRST205' ||
    candidate.code === '42P01' ||
    candidate.message?.includes('Could not find the table') === true ||
    candidate.message?.includes('does not exist') === true
  )
}

export const brandingService = {
  async getByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('tenant_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) {
      if (isMissingRelationError(error)) return null
      throw error
    }
    return data as TenantBranding | null
  },

  async upsertByOrganization(
    organizationId: string,
    branding: Partial<
      Pick<
        TenantBranding,
        | 'public_name'
        | 'logo_url'
        | 'favicon_url'
        | 'primary_color'
        | 'secondary_color'
        | 'accent_color'
        | 'font_family'
        | 'meta'
      >
    >
  ) {
    const { data, error } = await supabase
      .from('tenant_branding')
      .upsert(
        {
          organization_id: organizationId,
          ...branding,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )
      .select('*')
      .single()

    if (error) throw error
    return data as TenantBranding
  },

  async getDomainsByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_domains')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingRelationError(error)) return []
      throw error
    }
    return data as OrganizationDomain[]
  },

  async addDomain(organizationId: string, domain: string) {
    const normalizedDomain = domain.trim().toLowerCase()
    const { data, error } = await supabase
      .from('organization_domains')
      .insert({
        organization_id: organizationId,
        domain: normalizedDomain,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) throw error
    return data as OrganizationDomain
  },

  async getBrandingByHost(host: string) {
    const { data, error } = await supabase.rpc('get_branding_by_host', {
      p_host: host,
    })

    if (error) {
      if (isMissingRelationError(error)) return null
      throw error
    }
    return (data ?? null) as (TenantBranding & { domain?: string }) | null
  },
}
