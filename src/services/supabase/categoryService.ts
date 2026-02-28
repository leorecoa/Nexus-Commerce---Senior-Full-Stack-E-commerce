import { supabase } from '@/lib/supabase'

interface CategoryInput {
  name: string
  slug: string
  description?: string
}

export const categoryService = {
  async getAll(organizationId?: string | null) {
    let query = supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(category: CategoryInput, organizationId: string) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...category, organization_id: organizationId })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async update(
    id: string,
    category: Partial<CategoryInput>,
    organizationId?: string | null
  ) {
    let query = supabase.from('categories').update(category).eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  },

  async delete(id: string, organizationId?: string | null) {
    let query = supabase.from('categories').delete().eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { error } = await query
    if (error) throw error
  },
}
