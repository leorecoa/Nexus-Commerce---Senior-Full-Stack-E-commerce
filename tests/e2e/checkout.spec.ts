import { test, expect } from '@playwright/test'
import { hasE2ECredentials, signInWithEmail } from './helpers/auth'
import { mockCheckoutApi, seedCartStorage } from './helpers/fixtures'

test('checkout route is protected for unauthenticated users', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login/)
})

test('authenticated checkout flow validates shipping details before submitting', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')

  await seedCartStorage(page)
  await mockCheckoutApi(page)
  await signInWithEmail(page)
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()

  const placeOrderButton = page.getByRole('button', { name: 'Place Order' })
  await expect(placeOrderButton).toBeVisible()

  await placeOrderButton.click()
  await expect(page.getByText('Street is required')).toBeVisible()

  await page.getByPlaceholder('Street').fill('Av. Paulista')
  await expect(page.getByText('Street is required')).not.toBeVisible()

  await page.getByPlaceholder('Number').fill('1000')
  await page.getByPlaceholder('Neighborhood').fill('Bela Vista')
  await page.getByPlaceholder('City').fill('Sao Paulo')
  await page.getByPlaceholder('State').fill('SP')
  await page.getByPlaceholder('ZIP code').fill('01310-100')

  await placeOrderButton.click()

  await expect(page).toHaveURL(/\/order-success\/33333333-3333-3333-3333-333333333333/)
  await expect(
    page.getByRole('heading', { name: 'Order Successful!' })
  ).toBeVisible()
})
