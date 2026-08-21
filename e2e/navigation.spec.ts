import { expect, test } from '@playwright/test'
import { gotoContentHome, gotoCreator, gotoSplash } from './helpers'

test.describe('creator and content routing', () => {
  test('the root redirects to the Creator profile', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/dean$/)
    await expect(page.getByRole('heading', { name: 'Dean' })).toBeVisible()
    await expect(page.getByText(/Profile coming soon/i)).toBeVisible()
  })

  test('the release splash is the Content entry screen', async ({ page }) => {
    await gotoSplash(page)
    await expect(page).toHaveURL(/\/dean\/bronze$/)
    await expect(page.getByRole('heading', { name: 'Bronze' })).toBeVisible()
    await expect(page.getByText('Tap to enter')).toBeVisible()
  })

  test('tapping the splash opens the release home', async ({ page }) => {
    await gotoSplash(page)
    await page.locator('.grain').first().click()
    await expect(page).toHaveURL(/\/dean\/bronze\/home$/)
    for (const label of ['Music', 'Videos', 'Merch', 'Events']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible()
    }
  })

  test('the tiles belong to the Content, not the Creator', async ({ page }) => {
    await gotoContentHome(page)
    for (const [label, seg] of [
      ['Music', 'music'],
      ['Videos', 'videos'],
      ['Merch', 'merch'],
      ['Events', 'events'],
    ]) {
      await gotoContentHome(page)
      await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
      // Every section nests under the release, never under the Creator.
      await expect(page).toHaveURL(new RegExp(`/dean/bronze/${seg}$`))
    }
  })

  test('back from a section returns to the release home', async ({ page }) => {
    await page.goto('/dean/bronze/merch')
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/dean\/bronze\/home$/)
  })

  test('shows an honest empty state for an unknown Creator', async ({ page }) => {
    await page.goto('/nobody')
    await expect(page.getByText(/No creator called/)).toBeVisible()
  })

  test('shows an honest empty state for an unknown release', async ({ page }) => {
    await page.goto('/dean/no-such-release')
    await expect(page.getByText(/No release called/)).toBeVisible()
  })
})
