import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'
import { Loading } from '@/components/Loading'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PageTransitionOverlay } from '@/components/cinematic/PageTransitionOverlay'
import { captureException } from '@/lib/monitoring'

const HomePage = lazy(() => import('@/features/home/HomePage').then(module => ({ default: module.HomePage })))
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const AuthCallbackPage = lazy(() =>
  import('@/features/auth/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage }))
)
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then(module => ({ default: module.ProductsPage })))
const CartPage = lazy(() => import('@/features/cart/CartPage').then(module => ({ default: module.CartPage })))
const CheckoutPage = lazy(() => import('@/features/checkout/CheckoutPage').then(module => ({ default: module.CheckoutPage })))
const OrderSuccessPage = lazy(() =>
  import('@/features/checkout/OrderSuccessPage').then(module => ({ default: module.OrderSuccessPage }))
)
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })))

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
            <Route path="/" element={<Layout><HomePage /></Layout>} />
            <Route path="/products" element={<Layout><ProductsPage /></Layout>} />
            <Route path="/cart" element={<Layout><CartPage /></Layout>} />
            <Route
              path="/checkout"
              element={<Layout><ProtectedRoute><CheckoutPage /></ProtectedRoute></Layout>}
            />
            <Route
              path="/order-success/:orderId"
              element={<Layout><ProtectedRoute><OrderSuccessPage /></ProtectedRoute></Layout>}
            />
            <Route
              path="/admin"
              element={<Layout><ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute></Layout>}
            />
            <Route path="/products/admin" element={<Navigate to="/admin" replace />} />
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
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
        <Analytics />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
