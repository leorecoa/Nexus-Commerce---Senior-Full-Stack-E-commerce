import { test, expect } from '@playwright/test'
import { hasE2ECredentials, signInWithEmail } from './helpers/auth'

test('admin route redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
})

test('authenticated admin can access scene builder and tenant selector', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')

  await signInWithEmail(page)
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Scene Builder' })).toBeVisible()
  await expect(page.locator('select').first()).toBeVisible()
})
