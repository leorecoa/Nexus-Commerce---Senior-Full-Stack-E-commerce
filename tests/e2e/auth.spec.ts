import { test, expect } from '@playwright/test'
import { hasE2ECredentials, signInWithEmail } from './helpers/auth'

test('auth page renders and supports mode switch', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
})

test('authenticated user can login and reach home', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')
  await signInWithEmail(page)
  await expect(page.getByRole('link', { name: 'Products' })).toBeVisible()
})
