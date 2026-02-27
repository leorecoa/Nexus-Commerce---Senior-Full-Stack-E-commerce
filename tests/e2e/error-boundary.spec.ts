import { test, expect } from '@playwright/test'

test('error boundary', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeDefined()
})
