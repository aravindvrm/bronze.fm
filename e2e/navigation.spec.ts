import { expect, test } from '@playwright/test'
import { gotoCreator } from './helpers'

test.describe('creator and content routing', () => {
  test('the root redirects to the default Creator profile', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/dean$/)
    // The tenant root is the Creator, not a release.
    await expect(page.getByRole('heading', { name: 'Dean' })).toBeVisible()
  })

  test('Content lives one level below the Creator', async ({ page }) => {
    await gotoCreator(page)
    await page.getByRole('button', { name: /Latest release/ }).click()
    await expect(page).toHaveURL(/\/dean\/bronze$/)
    await expect(page.getByRole('heading', { name: 'Bronze' })).toBeVisible()
  })

  test('reaches a release through the music index', async ({ page }) => {
    await gotoCreator(page)
    await page.getByRole('button', { name: /^Music/ }).click()
    await expect(page).toHaveURL(/\/dean\/music$/)

    await page.getByRole('button', { name: /Bronze/ }).first().click()
    await expect(page).toHaveURL(/\/dean\/bronze$/)
  })

  test('section routes win over Content slugs', async ({ page }) => {
    // /dean/merch must resolve to the section, never to a Content lookup.
    for (const [seg, heading] of [
      ['music', 'Music'],
      ['videos', 'Videos'],
      ['merch', 'Merch'],
      ['events', 'Events'],
    ]) {
      await page.goto(`/dean/${seg}`)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })

  test('back from a release returns to the Creator profile', async ({ page }) => {
    await gotoCreator(page, '/bronze')
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/dean$/)
    await expect(page.getByRole('heading', { name: 'Dean' })).toBeVisible()
  })

  test('shows an honest empty state for an unknown Creator', async ({ page }) => {
    await page.goto('/nobody')
    await expect(page.getByText(/No creator called/)).toBeVisible()
  })

  test('shows an honest empty state for unknown Content', async ({ page }) => {
    await page.goto('/dean/no-such-release')
    await expect(page.getByText(/has nothing at/)).toBeVisible()
  })
})
