import { expect, test } from '@playwright/test'
import { gotoCreator, gotoFeed, gotoProject } from './helpers'

/**
 * The route structure from PLAN.md §8.2. These are the safety net for the
 * restructure: they assert the shape of every URL the app claims to serve,
 * including the two rules that are easy to break silently — the `@` prefix
 * and the creator-section-before-project-slug ordering.
 */

test.describe('the feed', () => {
  test('is the app root, and belongs to no creator', async ({ page }) => {
    await gotoFeed(page)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /bronze/i })).toBeVisible()
  })

  test('lists the creator and their work', async ({ page }) => {
    await gotoFeed(page)
    await expect(page.getByRole('button', { name: /Dean/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Bronze/ }).first()).toBeVisible()
  })

  test('filters as you search, and says so when nothing matches', async ({ page }) => {
    await gotoFeed(page)
    const search = page.getByRole('searchbox', { name: /search/i })

    await search.fill('bronze')
    await expect(page.getByRole('button', { name: /Bronze/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Atonomos/ })).toHaveCount(0)

    await search.fill('zzzz-no-such-thing')
    await expect(page.getByText(/Nothing matches/)).toBeVisible()
  })

  test('leads into a creator', async ({ page }) => {
    await gotoFeed(page)
    await page.getByRole('button', { name: /Dean/ }).first().click()
    await expect(page).toHaveURL(/\/@dean$/)
  })
})

test.describe('creator routing', () => {
  test('the creator lives behind an @ handle', async ({ page }) => {
    await gotoCreator(page)
    await expect(page).toHaveURL(/\/@dean$/)
    await expect(page.getByRole('heading', { name: 'Dean' })).toBeVisible()
  })

  /*
   * The reason the prefix exists. A bare first segment must never resolve to a
   * creator, or every future top-level route becomes a breaking rename for
   * whoever holds that handle.
   */
  test('a bare segment without @ is not treated as a handle', async ({ page }) => {
    await page.goto('/dean')
    await expect(page.getByText(/No page called/)).toBeVisible()
  })

  test('shows an honest empty state for an unknown creator', async ({ page }) => {
    await page.goto('/@nobody')
    await expect(page.getByText(/No creator called/)).toBeVisible()
  })

  test('carries creator-level Merch and Events', async ({ page }) => {
    await gotoCreator(page)
    for (const seg of ['merch', 'events']) {
      await page.goto(`/@dean/${seg}`)
      await expect(page).toHaveURL(new RegExp(`/@dean/${seg}$`))
    }
  })

  /*
   * Creator sections share a path segment with project slugs, so the router
   * must match sections first. A project called `merch` is rejected by both
   * RESERVED_PROJECT_SLUGS and a CHECK constraint, which is what makes this
   * ordering safe rather than merely lucky.
   */
  test('creator sections resolve ahead of project slugs', async ({ page }) => {
    await page.goto('/@dean/merch')
    await expect(page.getByRole('heading', { name: 'Merch' }).first()).toBeVisible()
  })
})

test.describe('projects', () => {
  test('a project hub lists its interfaces', async ({ page }) => {
    await gotoProject(page)
    await expect(page).toHaveURL(/\/@dean\/bronze$/)
    await expect(page.getByRole('button', { name: /^Music/ })).toBeVisible()
  })

  test('the music interface is a segment below the project', async ({ page }) => {
    await gotoProject(page)
    await page.getByRole('button', { name: /^Music/ }).click()
    await expect(page).toHaveURL(/\/@dean\/bronze\/music$/)
  })

  test('the whitepaper project resolves and offers its reader', async ({ page }) => {
    await page.goto('/@dean/atonomos')
    await expect(page.getByRole('heading', { name: 'Atonomos' }).first()).toBeVisible()
    await page.getByRole('button', { name: /^Read/ }).click()
    await expect(page).toHaveURL(/\/@dean\/atonomos\/read$/)
  })

  test('shows an honest empty state for an unknown project', async ({ page }) => {
    await page.goto('/@dean/no-such-project')
    await expect(page.getByText(/No project called/)).toBeVisible()
  })

  test('an unknown interface type is not found rather than blank', async ({ page }) => {
    await page.goto('/@dean/bronze/tapdance')
    await expect(page.getByText(/No section called/)).toBeVisible()
  })
})
