import { StoryScene } from '@/types'
import { organizationService } from './organizationService'
import { supabase } from '@/lib/supabase'

interface SceneInput {
  scene_type: StoryScene['scene_type']
  position: number
  product_id?: string | null
  is_active?: boolean
  content: StoryScene['content']
}

const getActiveStoreId = async (organizationId: string) => organizationService.getActiveStoreId(organizationId)

const requireStoreId = async (organizationId: string) => {
  const storeId = await getActiveStoreId(organizationId)

  if (!storeId) {
    throw new Error('No active store found for selected organization')
  }

  return storeId
}

export const sceneService = {
  async getByOrganization(organizationId: string) {
    const storeId = await getActiveStoreId(organizationId)
    if (!storeId) return []

    const { data, error } = await supabase
      .from('story_scenes')
      .select('*')
      .eq('store_id', storeId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as StoryScene[]
  },

  async getPublicByOrganization(organizationId: string) {
    const storeId = await getActiveStoreId(organizationId)
    if (!storeId) return []

    const { data, error } = await supabase
      .from('story_scenes')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as StoryScene[]
  },

  async create(organizationId: string, input: SceneInput) {
    const storeId = await requireStoreId(organizationId)
    const { data, error } = await supabase
      .from('story_scenes')
      .insert({
        ...input,
        store_id: storeId,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as StoryScene
  },

  async update(sceneId: string, organizationId: string, input: Partial<SceneInput>) {
    const storeId = await requireStoreId(organizationId)
    const { data, error } = await supabase
      .from('story_scenes')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', sceneId)
      .eq('store_id', storeId)
      .select('*')
      .single()

    if (error) throw error
    return data as StoryScene
  },

  async delete(sceneId: string, organizationId: string) {
    const storeId = await requireStoreId(organizationId)
    const { error } = await supabase
      .from('story_scenes')
      .delete()
      .eq('id', sceneId)
      .eq('store_id', storeId)

    if (error) throw error
  },
}
