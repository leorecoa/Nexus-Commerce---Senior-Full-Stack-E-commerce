import { supabase } from '@/lib/supabase'
import { LoginInput } from '@/schemas'

interface SignUpInput extends LoginInput {
  full_name?: string
}

const mapAuthError = (message: string) => {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Email ou senha invalidos.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar.'
  }

  if (normalized.includes('email logins are disabled')) {
    return 'Login por email/senha esta desativado neste projeto Supabase.'
  }

  if (normalized.includes('user already registered')) {
    return 'Este email ja esta cadastrado.'
  }

  return message
}

export const authService = {
  async signIn(data: LoginInput) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    })
    if (error) throw new Error(mapAuthError(error.message))
    return authData
  },

  async signUp(data: SignUpInput) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: data.full_name?.trim() || null,
        },
      },
    })

    if (error) throw new Error(mapAuthError(error.message))
    return authData
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error) {
      return data
    }

    const noProfile = error.code === 'PGRST116'

    if (!noProfile) {
      throw error
    }

    const { data: authUserData } = await supabase.auth.getUser()
    const fallbackEmail = authUserData.user?.email

    if (!fallbackEmail) {
      throw error
    }

    const { data: createdProfile, error: createError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          email: fallbackEmail,
          role: 'customer',
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single()

    if (createError) throw createError
    return createdProfile
  },
}
