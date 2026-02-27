import { supabase } from '@/lib/supabase'
import { TenantOrganization } from '@/stores/tenantStore'

interface MembershipRow {
  role: TenantOrganization['role']
  organization_id: string
  organizations:
    | {
      id: string
      name: string
      slug: string
    }
    | {
      id: string
      name: string
      slug: string
    }[]
    | null
}

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const organizationService = {
  async getUserOrganizations(userId: string) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('role, organization_id, organizations(id, name, slug)')
      .eq('user_id', userId)

    if (error) throw error

    return (data as MembershipRow[])
      .map(row => {
        const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
        return { ...row, organizations: organization ?? null }
      })
      .filter(row => row.organizations !== null)
      .map(row => ({
        id: row.organizations!.id,
        name: row.organizations!.name,
        slug: row.organizations!.slug,
        role: row.role,
      }))
  },

  async getActiveStoreId(organizationId: string) {
    const { data, error } = await supabase
      .from('stores')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) throw error
    return data?.[0]?.id ?? null
  },

  async ensureDefaultStore(organizationId: string) {
    const existingStoreId = await this.getActiveStoreId(organizationId)
    if (existingStoreId) return existingStoreId

    const baseSlug = 'default-store'
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`
      const slug = normalizeSlug(`${baseSlug}${suffix}`)

      const { data, error } = await supabase
        .from('stores')
        .insert({
          organization_id: organizationId,
          name: 'Default Store',
          slug,
          is_active: true,
        })
        .select('id')
        .single()

      if (!error) {
        return data.id as string
      }

      if (error.code !== '23505') {
        throw error
      }
    }

    throw new Error('Failed to create default store for organization')
  },

  async bootstrapTenant(organizationName = 'My Organization') {
    const { data, error } = await supabase.rpc('bootstrap_tenant', {
      p_organization_name: organizationName,
    })

    if (error) throw error
    return data as string
  },
}
