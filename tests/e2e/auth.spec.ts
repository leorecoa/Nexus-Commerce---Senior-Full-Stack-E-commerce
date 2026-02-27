import { test, expect } from '@playwright/test'

test('auth flow', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('h2')).toContainText('Sign in')
})
