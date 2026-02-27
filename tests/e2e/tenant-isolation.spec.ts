import { test, expect } from '@playwright/test'
import { hasE2ECredentials, signInWithEmail } from './helpers/auth'

test('tenant selector keeps app stable while changing organization', async ({ page }) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated flow')

  await signInWithEmail(page)
  await page.goto('/products')

  const orgSelector = page.locator('nav select').first()
  const optionCount = await orgSelector.locator('option').count()
  test.skip(optionCount < 1, 'No organization available for selector validation')

  const firstOrgValue = await orgSelector.inputValue()
  if (optionCount > 1) {
    const secondValue = await orgSelector.locator('option').nth(1).getAttribute('value')
    if (secondValue) {
      await orgSelector.selectOption(secondValue)
      await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
      await orgSelector.selectOption(firstOrgValue)
      await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
    }
  } else {
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  }
})
