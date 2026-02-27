import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, User, LogOut, Store } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/supabase/authService'
import { CinematicButton } from './cinematic/CinematicButton'
import { organizationService } from '@/services/supabase/organizationService'
import { useTenantStore } from '@/stores/tenantStore'
import { useToastStore } from '@/stores/toastStore'

export const Navbar = () => {
  const { items } = useCartStore()
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const addToast = useToastStore(state => state.addToast)
  const bootstrapAttemptRef = useRef<string | null>(null)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const { organizations, activeOrganizationId, setOrganizations, setActiveOrganizationId } = useTenantStore(state => ({
    organizations: state.organizations,
    activeOrganizationId: state.activeOrganizationId,
    setOrganizations: state.setOrganizations,
    setActiveOrganizationId: state.setActiveOrganizationId,
  }))

  const { data: membershipOrganizations } = useQuery({
    queryKey: ['tenant-orgs', user?.id],
    queryFn: () => organizationService.getUserOrganizations(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 300_000,
  })

  const { mutate: bootstrapTenant, isPending: isBootstrapPending } = useMutation({
    mutationFn: () => organizationService.bootstrapTenant('My Organization'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-orgs', user?.id] })
    },
    onError: error => {
      addToast({
        title: 'Falha no onboarding',
        description: error instanceof Error ? error.message : 'Não foi possível criar sua organização inicial.',
        variant: 'error',
      })
    },
  })

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !membershipOrganizations) {
      return
    }

    if (membershipOrganizations.length > 0) {
      setOrganizations(membershipOrganizations)
      bootstrapAttemptRef.current = null
      return
    }

    if (isBootstrapPending || bootstrapAttemptRef.current === user.id) {
      return
    }

    bootstrapAttemptRef.current = user.id
    bootstrapTenant()
  }, [isAuthenticated, membershipOrganizations, setOrganizations, user?.id, isBootstrapPending, bootstrapTenant])

  const handleOrgChange = (organizationId: string) => {
    setActiveOrganizationId(organizationId)
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-slate-950/55 backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-2xl text-white">
          <Store size={28} className="text-[color:var(--theme-accent)]" />
          <span>TechStore</span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          {isAuthenticated && organizations.length > 0 && (
            <select
              value={activeOrganizationId ?? organizations[0].id}
              onChange={event => handleOrgChange(event.target.value)}
              className="max-w-44 rounded-full border border-white/20 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.12em] text-white/85"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                  {org.name}
                </option>
              ))}
            </select>
          )}

          <Link to="/products" className="text-sm uppercase tracking-[0.2em] text-white/80 transition hover:text-white">
            Products
          </Link>

          <Link to="/cart" className="relative text-white/80 transition hover:text-white" aria-label="Cart">
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--theme-accent)] text-xs font-bold text-slate-900">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <Link to="/admin" className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">
                  Admin
                </Link>
              )}
              <CinematicButton
                tone="ghost"
                onClick={() => authService.signOut()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.18em]"
              >
                <LogOut size={14} />
                Logout
              </CinematicButton>
            </div>
          ) : (
            <Link to="/login">
              <CinematicButton tone="accent" className="inline-flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-[0.2em]">
                <User size={14} />
                Login
              </CinematicButton>
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
