import { test, expect } from '@playwright/test'

test('checkout flow', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Products')
})
