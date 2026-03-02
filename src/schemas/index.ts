import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const customerSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  volume: z.string().optional(),
  type: z.string().optional(),
  image_url: z.string().url('Invalid URL').optional(),
  category_id: z.string().uuid().optional(),
  stock_quantity: z.number().int().nonnegative('Stock must be non-negative'),
  is_active: z.boolean().default(true),
})

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Cart cannot be empty'),
  shipping_address: z.object({
    street: z.string().min(1, 'Street is required'),
    number: z.string().min(1, 'Number is required'),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, 'Neighborhood is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'State must have 2 characters'),
    zip: z.string().min(5, 'ZIP code is required'),
  }),
  payment_method: z.string().min(1, 'Payment method is required').optional(),
  use_wallet_balance: z.boolean().default(false),
})

export const reviewSchema = z.object({
  product_id: z.string().uuid(),
  customer_name: z.string().min(1, 'Name is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type ProductInput = z.infer<typeof productSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
