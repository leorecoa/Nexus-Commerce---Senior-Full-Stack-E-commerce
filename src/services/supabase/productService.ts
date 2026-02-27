import { supabase } from '@/lib/supabase'
import { ProductInput } from '@/schemas'

interface GetProductsOptions {
  includeInactive?: boolean
}

export const productService = {
  async getAll(organizationId?: string | null, options: GetProductsOptions = {}) {
    const includeInactive = options.includeInactive ?? false

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getById(id: string, organizationId?: string | null) {
    let query = supabase
      .from('products')
      .select('*')
      .eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.single()
    if (error) throw error
    return data
  },

  async create(product: ProductInput, organizationId: string) {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, organization_id: organizationId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, product: Partial<ProductInput>, organizationId?: string | null) {
    let query = supabase
      .from('products')
      .update(product)
      .eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.select().single()
    if (error) throw error
    return data
  },

  async delete(id: string, organizationId?: string | null) {
    let query = supabase.from('products').delete().eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { error } = await query
    if (error) throw error
  },

  async uploadImage(file: File) {
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('products')
      .upload(fileName, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(data.path)
    return publicUrl
  },
}
