import { create } from 'zustand'
import { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  isAdmin: () => boolean
  isStaff: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: user => set({ user }),
  isAdmin: () => get().user?.role === 'admin',
  isStaff: () => get().user?.role === 'staff' || get().user?.role === 'admin',
}))
