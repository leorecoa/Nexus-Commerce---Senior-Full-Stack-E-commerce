export type UserRole = 'customer' | 'admin' | 'staff'
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

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
  theme?: JsonValue
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
  status:
    | 'pending'
    | 'paid'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
  payment_method?: string
  tracking_code?: string
  notes?: string
  used_wallet_balance: number
  final_charge_amount?: number
  shipping_address_snapshot: JsonValue
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
  metadata?: JsonValue
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
  template_version: number
  template_key?: string | null
  experiment_id?: string | null
  variant_id?: string | null
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

export interface CampaignTemplate {
  id: string
  key: string
  name: string
  description?: string | null
  style_family: string
  scene_bundle: JsonValue
  is_active: boolean
  is_system: boolean
  organization_id?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface StoreSceneVersion {
  id: string
  store_id: string
  template_version: number
  source_template_key?: string | null
  scenes_snapshot: JsonValue
  created_by?: string | null
  created_at: string
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

export interface TenantBranding {
  id: string
  organization_id: string
  public_name?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  font_family?: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationDomain {
  id: string
  organization_id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  verification_token: string
  validated_at?: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface AnalyticsExport {
  id: string
  organization_id: string
  requested_by?: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled'
  format: 'csv'
  filters: Record<string, unknown>
  storage_path?: string | null
  download_url?: string | null
  row_count?: number | null
  error_message?: string | null
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationWebhook {
  id: string
  organization_id: string
  name: string
  target_url: string
  event_types: string[]
  secret?: string | null
  status: 'active' | 'paused' | 'disabled'
  timeout_ms: number
  max_retries: number
  headers: Record<string, unknown>
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface WebhookDeadLetter {
  id: string
  webhook_id?: string | null
  event_type: string
  payload: Record<string, unknown>
  attempt_count: number
  max_attempts: number
  last_error?: string | null
  dead_lettered_at?: string | null
  created_at: string
}
