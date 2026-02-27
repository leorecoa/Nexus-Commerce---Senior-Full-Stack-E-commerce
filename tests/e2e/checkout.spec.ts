import { test, expect } from '@playwright/test'
import { hasE2ECredentials, signInWithEmail } from './helpers/auth'

test('checkout route is protected for unauthenticated users', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login/)
})

test('authenticated checkout flow reaches checkout page', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')

  await signInWithEmail(page)

  await page.goto('/')
  await page.goto('/products')
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

  const addButtons = page.getByRole('button', { name: /^Add$/ })
  const addCount = await addButtons.count()
  test.skip(addCount === 0, 'No active products available for checkout test')
  await addButtons.first().click()

  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible()
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click()

  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible()
})
