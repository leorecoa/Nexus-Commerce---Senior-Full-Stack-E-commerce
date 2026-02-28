import { StoryScene } from '@/types'
import { supabase } from '@/lib/supabase'

const isMissingExperimentSchemaError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === 'PGRST202' ||
    candidate.code === 'PGRST205' ||
    candidate.code === '42883' ||
    candidate.code === '42P01' ||
    candidate.message?.includes('Could not find the function') === true ||
    candidate.message?.includes('Could not find the table') === true
  )
}

export const experimentService = {
  async getScenesForSession(
    organizationId: string,
    sessionId: string,
    userId?: string
  ) {
    const { data, error } = await supabase.rpc('get_story_scenes_for_session', {
      p_org_id: organizationId,
      p_session_id: sessionId,
      p_user_id: userId ?? null,
    })

    if (error) {
      if (isMissingExperimentSchemaError(error)) {
        return [] as StoryScene[]
      }
      throw error
    }

    return (data ?? []) as StoryScene[]
  },

  async trackVariantEvent(input: {
    organizationId: string
    eventType:
      | 'impression'
      | 'cta_click'
      | 'add_to_cart'
      | 'checkout_start'
      | 'conversion'
    sessionId: string
    userId?: string
    experimentId?: string | null
    variantId?: string | null
    metadata?: Record<string, unknown>
  }) {
    const { error } = await supabase.rpc('track_scene_variant_event', {
      p_org_id: input.organizationId,
      p_event_type: input.eventType,
      p_session_id: input.sessionId,
      p_user_id: input.userId ?? null,
      p_experiment_id: input.experimentId ?? null,
      p_variant_id: input.variantId ?? null,
      p_metadata: input.metadata ?? {},
    })

    if (error && !isMissingExperimentSchemaError(error)) {
      throw error
    }
  },
}
