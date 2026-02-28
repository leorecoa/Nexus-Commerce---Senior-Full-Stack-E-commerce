import { supabase } from '@/lib/supabase'

export const leadService = {
  async createLead(input: {
    name: string
    email: string
    company?: string
    message?: string
    source?: string
  }) {
    const { error } = await supabase.from('saas_leads').insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      company: input.company?.trim() || null,
      message: input.message?.trim() || null,
      source: input.source ?? 'demo',
    })

    if (error) throw error
  },
}
