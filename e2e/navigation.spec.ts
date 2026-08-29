import { expect, test } from '@playwright/test'
import { gotoCreator, gotoFeed, gotoProject, openSearch } from './helpers'

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
    const search = await openSearch(page)

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

  // The creator row used to show a Project's cover art rather than the
  // Creator's own avatar — same regression the profile page had.
  test('shows the creator’s own avatar, not a project cover', async ({ page }) => {
    await gotoFeed(page)
    const avatar = page.locator('img[alt=""]').first()
    expect(await avatar.getAttribute('src')).toContain('/avatars/dean')
  })

  /*
   * Feed entries are typed interfaces, not Projects: Atonomos's whitepaper
   * and Bronze's tracklist are each their own row, newest first, and each
   * leads straight to that interface rather than to a project hub.
   */
  test('lists published interfaces newest first, and opens straight into one', async ({ page }) => {
    await gotoFeed(page)
    const feed = page.locator('section').filter({ hasText: 'FEED' }).first()
    const rows = feed.getByTestId('feed-rows').getByRole('button')

    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText('Autonomous: The Agentic Enterprise')
    await expect(rows.nth(1)).toContainText('Bronze')

    await rows.nth(1).click()
    await expect(page).toHaveURL(/\/@dean\/bronze\/music$/)
  })
})

test.describe('app header', () => {
  test('the menu opens and leads home', async ({ page }) => {
    await gotoCreator(page)
    await page.getByRole('button', { name: /open menu/i }).click()
    await page.getByRole('navigation', { name: 'Main' }).getByText('Home').click()
    await expect(page).toHaveURL(/\/$/)
  })

  /*
   * Account and Settings are deliberately inert until those features exist.
   * They render as text rather than disabled buttons so the tab order skips
   * them outright, which is what this asserts: no control, just a label.
   */
  test('unbuilt destinations are shown but not actionable', async ({ page }) => {
    await gotoFeed(page)
    await page.getByRole('button', { name: /open menu/i }).click()
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav).toContainText('Account')
    await expect(nav).toContainText('Settings')
    await expect(nav.getByRole('button', { name: /^Account$/ })).toHaveCount(0)
    await expect(nav.getByRole('button', { name: /^Settings$/ })).toHaveCount(0)
  })

  // Closing search must also drop the query, or the screen stays filtered
  // by a control the visitor just dismissed.
  test('closing search clears the filter it applied', async ({ page }) => {
    await gotoFeed(page)
    const search = await openSearch(page)
    await search.fill('zzzz-no-such-thing')
    await expect(page.getByText(/Nothing matches/)).toBeVisible()

    await page.getByRole('button', { name: /close search/i }).click()
    await expect(page.getByText(/Nothing matches/)).toHaveCount(0)
  })
})

test.describe('creator profile tabs', () => {
  test('each tab reveals its own panel, one at a time', async ({ page }) => {
    await gotoCreator(page)
    await expect(page.getByTestId('panel-pinned')).toBeVisible()

    for (const [name, panel] of [
      ['Projects', 'panel-projects'],
      ['Store', 'panel-store'],
      ['Events', 'panel-events'],
    ] as const) {
      await page.getByRole('tab', { name }).click()
      await expect(page.getByTestId(panel)).toBeVisible()
      await expect(page.getByTestId('panel-pinned')).toHaveCount(0)
    }
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

  test('carries creator-level Store and Events', async ({ page }) => {
    await gotoCreator(page)
    for (const seg of ['store', 'events']) {
      await page.goto(`/@dean/${seg}`)
      await expect(page).toHaveURL(new RegExp(`/@dean/${seg}$`))
    }
  })

  /*
   * Creator sections share a path segment with project slugs, so the router
   * must match sections first. A project called `store` is rejected by both
   * RESERVED_PROJECT_SLUGS and a CHECK constraint, which is what makes this
   * ordering safe rather than merely lucky.
   */
  test('creator sections resolve ahead of project slugs', async ({ page }) => {
    await page.goto('/@dean/store')
    await expect(page.getByRole('heading', { name: 'Store' }).first()).toBeVisible()
  })

  /*
   * The profile has no header of its own, so without this mark a visitor
   * who arrives here (from a shared link, or by following the Creators tile
   * from the feed) has no way back to the feed short of the browser's own
   * back button — which does not exist at all as a PWA gesture on some
   * platforms, and even where it does, is one tap the app itself should not
   * lean on for a destination this core.
   */
  test('leads back to the feed', async ({ page }) => {
    await gotoCreator(page)
    await page.getByRole('button', { name: /bronze\.fm home/i }).click()
    await expect(page).toHaveURL(/\/$/)
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
