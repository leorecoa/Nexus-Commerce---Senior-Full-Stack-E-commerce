import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import {
  AUTH_EVENT_STORAGE_KEY,
  authService,
} from '@/services/supabase/authService'

export const useAuth = () => {
  const { user, setUser } = useAuthStore()
  const clearTenant = useTenantStore(state => state.clearTenant)

  useEffect(() => {
    const resetAuthState = () => {
      setUser(null)
      clearTenant()
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        authService
          .getProfile(session.user.id)
          .then(setUser)
          .catch(console.error)
      } else {
        resetAuthState()
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        authService
          .getProfile(session.user.id)
          .then(setUser)
          .catch(console.error)
      } else {
        resetAuthState()
      }
    })

    const authChannel =
      'BroadcastChannel' in window
        ? new BroadcastChannel('nexus-auth-events')
        : null

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_EVENT_STORAGE_KEY && event.newValue) {
        resetAuthState()
      }
    }

    const onBroadcast = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'logout') {
        resetAuthState()
      }
    }

    const onFocus = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          authService
            .getProfile(session.user.id)
            .then(setUser)
            .catch(console.error)
          return
        }
        resetAuthState()
      })
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    authChannel?.addEventListener('message', onBroadcast)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      authChannel?.removeEventListener('message', onBroadcast)
      authChannel?.close()
    }
  }, [setUser, clearTenant])

  return { user, isAuthenticated: !!user }
}
