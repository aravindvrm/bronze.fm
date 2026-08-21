import { expect, test } from '@playwright/test'
import { gotoContentHome, gotoCreator, gotoSplash } from './helpers'

test.describe('creator and content routing', () => {
  test('the root redirects to the Creator profile', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/robotrebel$/)
    await expect(page.getByRole('heading', { name: 'robotrebel' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Content/ })).toBeVisible()
  })

  test('the release splash is the Content entry screen', async ({ page }) => {
    await gotoSplash(page)
    await expect(page).toHaveURL(/\/robotrebel\/bronze$/)
    await expect(page.getByRole('heading', { name: 'Bronze' })).toBeVisible()
    await expect(page.getByText('Tap to enter')).toBeVisible()
  })

  test('tapping the splash opens the release home', async ({ page }) => {
    await gotoSplash(page)
    await page.locator('.grain').first().click()
    await expect(page).toHaveURL(/\/robotrebel\/bronze\/home$/)
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
      await expect(page).toHaveURL(new RegExp(`/robotrebel/bronze/${seg}$`))
    }
  })

  test('back from a section returns to the release home', async ({ page }) => {
    await page.goto('/robotrebel/bronze/merch')
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/robotrebel\/bronze\/home$/)
  })

  test('shows an honest empty state for an unknown Creator', async ({ page }) => {
    await page.goto('/nobody')
    await expect(page.getByText(/No creator called/)).toBeVisible()
  })

  test('shows an honest empty state for an unknown release', async ({ page }) => {
    await page.goto('/robotrebel/no-such-release')
    await expect(page.getByText(/No release called/)).toBeVisible()
  })
})

test.describe('two-level sections', () => {
  test('the Creator page carries Content, Merch and Events', async ({ page }) => {
    await page.goto('/robotrebel')
    for (const label of ['Content', 'Merch', 'Events']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible()
    }
    // Videos live inside a release, so there is no tile for them here.
    await expect(page.getByRole('button', { name: /^Videos/ })).toHaveCount(0)
  })

  test('Creator sections resolve ahead of Content slugs', async ({ page }) => {
    for (const [seg, heading] of [
      ['content', 'Content'],
      ['merch', 'Merch'],
      ['events', 'Events'],
    ]) {
      await page.goto(`/robotrebel/${seg}`)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
      // Must not be read as a release called "merch".
      await expect(page.getByText(/No release called/)).toHaveCount(0)
    }
  })

  test('Content links through to the release splash', async ({ page }) => {
    await page.goto('/robotrebel/content')
    await page.getByRole('button', { name: /Bronze/ }).first().click()
    await expect(page).toHaveURL(/\/robotrebel\/bronze$/)
    await expect(page.getByText('Tap to enter')).toBeVisible()
  })

  test('a release section is a subset of the Creator section', async ({ page }) => {
    // Creator-wide merch includes items with no release tag.
    await page.goto('/robotrebel/merch')
    await expect(page.getByText('Alloy Hoodie')).toBeVisible()
    await expect(page.getByText('Bronze Vinyl')).toBeVisible()

    // The release view shows only what is tagged to it.
    await page.goto('/robotrebel/bronze/merch')
    await expect(page.getByText('Bronze Vinyl')).toBeVisible()
    await expect(page.getByText('Alloy Hoodie')).toHaveCount(0)
  })

  test('the Creator event list includes dates outside the tour', async ({ page }) => {
    await page.goto('/robotrebel/events')
    await expect(page.getByText('London, UK')).toBeVisible()

    await page.goto('/robotrebel/bronze/events')
    await expect(page.getByText('Brooklyn, NY')).toBeVisible()
    await expect(page.getByText('London, UK')).toHaveCount(0)
  })
})
