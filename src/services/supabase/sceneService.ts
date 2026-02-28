import { CampaignTemplate, StoreSceneVersion, StoryScene } from '@/types'
import { organizationService } from './organizationService'
import { supabase } from '@/lib/supabase'

interface SceneInput {
  scene_type: StoryScene['scene_type']
  position: number
  product_id?: string | null
  is_active?: boolean
  content: StoryScene['content']
}

const getActiveStoreId = async (organizationId: string) =>
  organizationService.getActiveStoreId(organizationId)

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

  async update(
    sceneId: string,
    organizationId: string,
    input: Partial<SceneInput>
  ) {
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

  async getTemplates(organizationId: string) {
    const { data, error } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as CampaignTemplate[]
  },

  async applyTemplate(
    organizationId: string,
    templateKey: string,
    productId?: string
  ) {
    const { data, error } = await supabase.rpc('apply_campaign_template', {
      p_org_id: organizationId,
      p_template_key: templateKey,
      p_product_id: productId ?? null,
    })

    if (error) throw error
    return Number(data)
  },

  async getTemplateVersions(organizationId: string) {
    const storeId = await getActiveStoreId(organizationId)
    if (!storeId) return []

    const { data, error } = await supabase
      .from('store_scene_versions')
      .select('*')
      .eq('store_id', storeId)
      .order('template_version', { ascending: false })

    if (error) throw error
    return data as StoreSceneVersion[]
  },

  async rollbackToVersion(organizationId: string, targetVersion: number) {
    const { data, error } = await supabase.rpc(
      'rollback_store_template_version',
      {
        p_org_id: organizationId,
        p_target_version: targetVersion,
      }
    )

    if (error) throw error
    return Number(data)
  },
}
