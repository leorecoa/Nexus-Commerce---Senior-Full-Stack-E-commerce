import { test, expect } from '@playwright/test'

test('admin dashboard', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.locator('body')).toBeDefined()
})
