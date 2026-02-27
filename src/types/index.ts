export type UserRole = 'customer' | 'admin' | 'staff'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  auth_user_id?: string
  user_role: UserRole
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
}

export interface Product {
  id: string
  organization_id: string
  name: string
  description?: string
  price: number
  volume?: string
  type?: string
  image_url?: string
  theme?: any
  category_id?: string
  is_active: boolean
  stock_quantity: number
  created_at: string
  updated_at: string
}

export interface ProductIngredient {
  id: string
  product_id: string
  name: string
  quantity?: string
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  organization_id: string
  customer_id?: string
  user_id?: string
  total_amount: number
  status: 'pending' | 'paid' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_method?: string
  tracking_code?: string
  notes?: string
  used_wallet_balance: number
  final_charge_amount?: number
  shipping_address_snapshot: any
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_address?: string
  customer_city?: string
  customer_zipcode?: string
  shipped_at?: string
  delivered_at?: string
  cancelled_at?: string
  cancellation_reason?: string
  is_test: boolean
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal?: number
  created_at: string
}

export interface Review {
  id: string
  organization_id: string
  product_id: string
  customer_name: string
  rating: number
  comment?: string
  is_visible: boolean
  user_id?: string
  created_at: string
}

export interface UserWallet {
  id: string
  organization_id: string
  customer_id: string
  balance: number
  total_deposited: number
  updated_at: string
}

export interface WalletTransaction {
  id: string
  organization_id: string
  wallet_id: string
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'ADMIN_ADJUSTMENT'
  amount: number
  description?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  stripe_payment_intent_id?: string
  metadata?: any
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  created_at: string
}

export interface StoryScene {
  id: string
  store_id: string
  product_id?: string | null
  scene_type: 'hero' | 'feature' | 'proof' | 'cta'
  position: number
  content: {
    title?: string
    subtitle?: string
    ctaLabel?: string
    [key: string]: unknown
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreTheme {
  id: string
  store_id: string
  name: string
  tokens: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}
