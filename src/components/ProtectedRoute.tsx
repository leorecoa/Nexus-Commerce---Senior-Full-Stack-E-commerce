import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { organizationService } from '@/services/supabase/organizationService'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { Loading } from '@/components/Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requiredPermission?: string
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requiredPermission,
}: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth()
  const userId = useAuthStore(state => state.user?.id)
  const isAdmin = useAuthStore(state => state.user?.role === 'admin')
  const activeOrganizationId = useTenantStore(
    state => state.activeOrganizationId
  )

  const { data: hasRequiredPermission, isPending: isPermissionLoading } =
    useQuery({
      queryKey: [
        'permission-check',
        userId,
        activeOrganizationId,
        requiredPermission,
      ],
      queryFn: () =>
        organizationService.hasPermission(
          activeOrganizationId!,
          requiredPermission!
        ),
      enabled:
        Boolean(userId) &&
        Boolean(activeOrganizationId) &&
        Boolean(requiredPermission),
      staleTime: 60_000,
    })

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (requiredPermission && !activeOrganizationId) {
    return <Navigate to="/onboarding" replace />
  }

  if (requiredPermission && isPermissionLoading) {
    return <Loading />
  }

  if (requiredPermission && !hasRequiredPermission) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
