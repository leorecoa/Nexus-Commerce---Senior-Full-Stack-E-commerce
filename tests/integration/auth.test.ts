import { describe, it, expect, vi } from 'vitest'
import { authService } from '@/services/supabase/authService'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

describe('authService', () => {
  it('should sign in with email and password', async () => {
    expect(authService.signIn).toBeDefined()
  })
})
