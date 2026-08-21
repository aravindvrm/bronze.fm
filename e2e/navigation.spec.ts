import { expect, test } from '@playwright/test'
import { gotoCreator } from './helpers'

test.describe('creator routing', () => {
  test('redirects the root to the default Creator', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/dean$/)
    await expect(page.getByRole('heading', { name: 'Bronze' })).toBeVisible()
  })

  test('walks splash to home to music and back', async ({ page }) => {
    await gotoCreator(page)
    await expect(page.getByText('Tap to enter')).toBeVisible()

    await page.locator('.grain').first().click()
    await expect(page).toHaveURL(/\/dean\/home$/)
    await expect(page.getByRole('button', { name: /^Music/ })).toBeVisible()

    await page.getByRole('button', { name: /^Music/ }).click()
    await expect(page).toHaveURL(/\/dean\/music$/)
    await expect(page.getByRole('button', { name: /Bronze Age \(Skit\)/ })).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/dean\/home$/)
  })

  test('shows an honest empty state for an unknown Creator', async ({ page }) => {
    await page.goto('/nobody')
    await expect(page.getByText(/No creator called/)).toBeVisible()
  })

  test('renders the stub sections', async ({ page }) => {
    for (const [seg, heading] of [
      ['videos', 'Videos'],
      ['merch', 'Merch'],
      ['events', 'Events'],
    ]) {
      await page.goto(`/dean/${seg}`)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })
})
