export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_SUCCESS: (orderId: string) => `/order-success/${orderId}`,
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  ADMIN: '/admin',
} as const
