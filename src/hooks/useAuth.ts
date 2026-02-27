import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { authService } from '@/services/supabase/authService'

export const useAuth = () => {
  const { user, setUser } = useAuthStore()
  const clearTenant = useTenantStore(state => state.clearTenant)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        authService.getProfile(session.user.id).then(setUser).catch(console.error)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        authService.getProfile(session.user.id).then(setUser).catch(console.error)
      } else {
        setUser(null)
        clearTenant()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, clearTenant])

  return { user, isAuthenticated: !!user }
}
