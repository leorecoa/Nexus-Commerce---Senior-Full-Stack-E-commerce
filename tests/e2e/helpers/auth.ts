import { expect, Page } from '@playwright/test'

export const E2E_EMAIL = process.env.E2E_EMAIL
export const E2E_PASSWORD = process.env.E2E_PASSWORD

export const hasE2ECredentials = Boolean(E2E_EMAIL && E2E_PASSWORD)

export const signInWithEmail = async (page: Page) => {
  if (!hasE2ECredentials) {
    throw new Error('Missing E2E credentials. Set E2E_EMAIL and E2E_PASSWORD.')
  }

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.getByPlaceholder('Email').fill(E2E_EMAIL!)
  await page.getByPlaceholder('Password').fill(E2E_PASSWORD!)
  await page.getByRole('button', { name: /Sign in to TechStore/i }).click()

  await page.waitForURL('**/')
  await expect(page).toHaveURL(/\/$/)
}
