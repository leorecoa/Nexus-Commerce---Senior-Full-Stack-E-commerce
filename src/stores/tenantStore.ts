import { create } from 'zustand'

export interface TenantOrganization {
  id: string
  name: string
  slug: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
}

interface TenantState {
  organizations: TenantOrganization[]
  activeOrganizationId: string | null
  setOrganizations: (organizations: TenantOrganization[]) => void
  setActiveOrganizationId: (organizationId: string | null) => void
  clearTenant: () => void
}

const TENANT_STORAGE_KEY = 'nexus_active_org_id'

const hasSameOrganizations = (left: TenantOrganization[], right: TenantOrganization[]) => {
  if (left.length !== right.length) {
    return false
  }

  return left.every((org, index) => {
    const other = right[index]
    return (
      org?.id === other?.id &&
      org?.name === other?.name &&
      org?.slug === other?.slug &&
      org?.role === other?.role
    )
  })
}

const getStoredOrganizationId = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(TENANT_STORAGE_KEY)
}

const setStoredOrganizationId = (organizationId: string | null) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!organizationId) {
    window.localStorage.removeItem(TENANT_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(TENANT_STORAGE_KEY, organizationId)
}

export const useTenantStore = create<TenantState>((set, get) => ({
  organizations: [],
  activeOrganizationId: getStoredOrganizationId(),
  setOrganizations: organizations => {
    const currentState = get()
    const currentActiveId = currentState.activeOrganizationId

    const stillExists = organizations.some(org => org.id === currentActiveId)
    const nextActiveId = stillExists ? currentActiveId : organizations[0]?.id ?? null

    if (
      hasSameOrganizations(currentState.organizations, organizations) &&
      currentState.activeOrganizationId === nextActiveId
    ) {
      return
    }

    setStoredOrganizationId(nextActiveId)
    set({ organizations, activeOrganizationId: nextActiveId })
  },
  setActiveOrganizationId: organizationId => {
    if (get().activeOrganizationId === organizationId) {
      return
    }
    setStoredOrganizationId(organizationId)
    set({ activeOrganizationId: organizationId })
  },
  clearTenant: () => {
    setStoredOrganizationId(null)
    set({ organizations: [], activeOrganizationId: null })
  },
}))
