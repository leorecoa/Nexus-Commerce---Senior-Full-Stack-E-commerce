import { lazy, Suspense, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { Loading } from '@/components/Loading'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PageTransitionOverlay } from '@/components/cinematic/PageTransitionOverlay'
import { captureException } from '@/lib/monitoring'
import { brandingService } from '@/services/supabase/brandingService'
import { useThemeEngineStore } from '@/features/theme-engine/themeStore'

const HomePage = lazy(() =>
  import('@/features/home/HomePage').then(module => ({
    default: module.HomePage,
  }))
)
const LoginPage = lazy(() =>
  import('@/features/auth/LoginPage').then(module => ({
    default: module.LoginPage,
  }))
)
const AuthCallbackPage = lazy(() =>
  import('@/features/auth/AuthCallbackPage').then(module => ({
    default: module.AuthCallbackPage,
  }))
)
const ProductsPage = lazy(() =>
  import('@/features/products/ProductsPage').then(module => ({
    default: module.ProductsPage,
  }))
)
const CartPage = lazy(() =>
  import('@/features/cart/CartPage').then(module => ({
    default: module.CartPage,
  }))
)
const CheckoutPage = lazy(() =>
  import('@/features/checkout/CheckoutPage').then(module => ({
    default: module.CheckoutPage,
  }))
)
const OrderSuccessPage = lazy(() =>
  import('@/features/checkout/OrderSuccessPage').then(module => ({
    default: module.OrderSuccessPage,
  }))
)
const AdminDashboard = lazy(() =>
  import('@/features/admin/AdminDashboard').then(module => ({
    default: module.AdminDashboard,
  }))
)
const PricingPage = lazy(() =>
  import('@/features/b2b/PricingPage').then(module => ({
    default: module.PricingPage,
  }))
)
const DemoPage = lazy(() =>
  import('@/features/b2b/DemoPage').then(module => ({
    default: module.DemoPage,
  }))
)
const OnboardingWizardPage = lazy(() =>
  import('@/features/onboarding/OnboardingWizardPage').then(module => ({
    default: module.OnboardingWizardPage,
  }))
)

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: error => {
      captureException(error, { source: 'react-query.query' })
    },
  }),
  mutationCache: new MutationCache({
    onError: error => {
      captureException(error, { source: 'react-query.mutation' })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
    },
  },
})

const isValidHexColor = (value?: string | null) =>
  Boolean(value?.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))

const hexToRgb = (hex: string) => {
  const color = hex.replace('#', '')
  const safe = color.length === 3 ? color.replace(/(.)/g, '$1$1') : color
  const num = Number.parseInt(safe, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

const WhiteLabelRuntime = () => {
  const setTheme = useThemeEngineStore(state => state.setTheme)

  const { data: hostBranding } = useQuery({
    queryKey: ['tenant-branding-host', window.location.hostname],
    queryFn: () => brandingService.getBrandingByHost(window.location.hostname),
    retry: false,
    staleTime: 10 * 60_000,
  })

  useEffect(() => {
    if (!hostBranding) return

    const currentTheme = useThemeEngineStore.getState().theme
    const nextPrimary = isValidHexColor(hostBranding.primary_color)
      ? hostBranding.primary_color!
      : currentTheme.primary
    const nextSecondary = isValidHexColor(hostBranding.secondary_color)
      ? hostBranding.secondary_color!
      : currentTheme.secondary
    const nextAccent = isValidHexColor(hostBranding.accent_color)
      ? hostBranding.accent_color!
      : currentTheme.accent

    setTheme({
      ...currentTheme,
      primary: nextPrimary,
      secondary: nextSecondary,
      accent: nextAccent,
      glow: hexToRgb(nextAccent),
      backgroundGradient: `radial-gradient(circle at 18% 18%, ${nextAccent}44, transparent 48%), radial-gradient(circle at 82% 22%, ${nextSecondary}55, transparent 44%), linear-gradient(155deg, #020617 0%, ${nextPrimary} 45%, ${nextSecondary} 100%)`,
    })

    if (hostBranding.public_name?.trim()) {
      document.title = hostBranding.public_name.trim()
    }

    if (hostBranding.favicon_url?.trim()) {
      const faviconHref = hostBranding.favicon_url.trim()
      let favicon = document.querySelector(
        "link[rel='icon']"
      ) as HTMLLinkElement | null
      if (!favicon) {
        favicon = document.createElement('link')
        favicon.rel = 'icon'
        document.head.appendChild(favicon)
      }
      favicon.href = faviconHref
    }

    if (hostBranding.font_family?.trim()) {
      document.body.style.fontFamily = hostBranding.font_family.trim()
    }
  }, [hostBranding, setTheme])

  return null
}

const AnimatedRoutes = () => {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <>
      <PageTransitionOverlay />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(8px)', y: -6 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/"
              element={
                <Layout>
                  <HomePage />
                </Layout>
              }
            />
            <Route
              path="/products"
              element={
                <Layout>
                  <ProductsPage />
                </Layout>
              }
            />
            <Route
              path="/cart"
              element={
                <Layout>
                  <CartPage />
                </Layout>
              }
            />
            <Route
              path="/checkout"
              element={
                <Layout>
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/order-success/:orderId"
              element={
                <Layout>
                  <ProtectedRoute>
                    <OrderSuccessPage />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/admin"
              element={
                <Layout>
                  <ProtectedRoute requiredPermission="admin.dashboard.access">
                    <AdminDashboard />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/onboarding"
              element={
                <Layout>
                  <ProtectedRoute>
                    <OnboardingWizardPage />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/pricing"
              element={
                <Layout>
                  <PricingPage />
                </Layout>
              }
            />
            <Route
              path="/demo"
              element={
                <Layout>
                  <DemoPage />
                </Layout>
              }
            />
            <Route
              path="/products/admin"
              element={<Navigate to="/admin" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WhiteLabelRuntime />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
