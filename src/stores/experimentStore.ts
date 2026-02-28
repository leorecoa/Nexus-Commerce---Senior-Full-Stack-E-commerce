import { create } from 'zustand'

interface ActiveVariantContext {
  experimentId: string | null
  variantId: string | null
}

interface ExperimentState {
  sessionId: string
  activeVariant: ActiveVariantContext
  ensureSessionId: () => string
  setActiveVariant: (context: ActiveVariantContext) => void
  clearActiveVariant: () => void
}

const STORAGE_KEY = 'nexus_exp_session_id'

const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') {
    return `ssr-${Math.random().toString(36).slice(2, 10)}`
  }

  const existing = window.localStorage.getItem(STORAGE_KEY)
  if (existing) {
    return existing
  }

  const next = crypto.randomUUID()
  window.localStorage.setItem(STORAGE_KEY, next)
  return next
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  sessionId: getOrCreateSessionId(),
  activeVariant: { experimentId: null, variantId: null },
  ensureSessionId: () => {
    const current = get().sessionId
    if (current) {
      return current
    }
    const next = getOrCreateSessionId()
    set({ sessionId: next })
    return next
  },
  setActiveVariant: context => set({ activeVariant: context }),
  clearActiveVariant: () =>
    set({ activeVariant: { experimentId: null, variantId: null } }),
}))
