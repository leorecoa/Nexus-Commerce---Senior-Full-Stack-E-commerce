import { test, expect } from '@playwright/test'
import { hasE2ECredentials, signInWithEmail } from './helpers/auth'
import { mockOperationsApi } from './helpers/fixtures'

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

test('authenticated admin validates operations forms before sending mutations', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')

  await signInWithEmail(page)
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Analytics Exports' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Outbound Webhooks' })).toBeVisible()

  await page.getByPlaceholder('30').fill('999')
  await page.getByRole('button', { name: 'Solicitar CSV' }).click()
  await expect(page.getByText('Janela invalida')).toBeVisible()

  await page.getByPlaceholder('Nome do webhook').fill('Orders Hook')
  await page
    .getByPlaceholder('https://api.exemplo.com/webhooks/orders')
    .fill('not-a-valid-url')
  await page.getByRole('button', { name: 'Criar webhook' }).click()

  await expect(page.getByText('Configuracao invalida')).toBeVisible()
})

test('authenticated admin can complete operations flows with mocked backend', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')

  await mockOperationsApi(page)
  await signInWithEmail(page)
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Analytics Exports' })).toBeVisible()

  await page.getByPlaceholder('30').fill('14')
  await page.getByRole('button', { name: 'Solicitar CSV' }).click()
  await expect(page.getByText('Export solicitado')).toBeVisible()
  await expect(page.getByText('CSV | pending')).toBeVisible()

  await page.getByPlaceholder('Nome do webhook').fill('Orders Hook')
  await page
    .getByPlaceholder('https://api.exemplo.com/webhooks/orders')
    .fill('https://example.com/webhooks/orders')
  await page
    .getByPlaceholder('checkout.completed, order.created')
    .fill('checkout.completed')
  await page.getByPlaceholder('Segredo HMAC').fill('fixture-secret')
  await page.getByRole('button', { name: 'Criar webhook' }).click()

  await expect(page.getByText('Webhook criado')).toBeVisible()
  await expect(page.getByText('Orders Hook')).toBeVisible()

  await page.getByRole('button', { name: 'Reenfileirar' }).click()
  await expect(page.getByText('Delivery reenfileirada')).toBeVisible()
  await expect(page.getByText('Nenhuma delivery em dead-letter.')).toBeVisible()
})
