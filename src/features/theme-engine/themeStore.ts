import { create } from 'zustand'
import { Product } from '@/types'
import { ProductTheme, defaultTheme, resolveProductTheme } from './themes'

interface ThemeEngineState {
  theme: ProductTheme
  setTheme: (theme: ProductTheme) => void
  setThemeFromProduct: (product?: Product | null) => void
  resetTheme: () => void
}

export const useThemeEngineStore = create<ThemeEngineState>(set => ({
  theme: defaultTheme,
  setTheme: theme => set({ theme }),
  setThemeFromProduct: product => set({ theme: resolveProductTheme(product) }),
  resetTheme: () => set({ theme: defaultTheme }),
}))
