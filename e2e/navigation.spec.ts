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

  test('leads into a creator', async ({ page }) => {
    await gotoFeed(page)
    await page.getByRole('button', { name: /Dean/ }).first().click()
    await expect(page).toHaveURL(/\/@deanMaye$/)
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
    await expect(page).toHaveURL(/\/@deanMaye\/bronze\/music$/)
  })

  /*
   * A project names its creator, and that name goes somewhere.
   *
   * It was plain text before: it said who made this and gave no way to reach
   * them. The header's back arrow is not the same thing — it returns to
   * wherever you came FROM, which for a shared link is nowhere at all.
   */
  test('the project hero carries the creator, and links to them', async ({ page }) => {
    await page.goto('/@deanMaye/atonomos')
    const link = page.getByRole('button', { name: /Dean.*creator profile/ })
    await expect(link).toBeVisible()
    // The creator's own photo, not the project's cover — those were once the
    // same image, which is exactly the confusion an avatar here would repeat.
    await expect(link.locator('img')).toHaveAttribute('src', /avatar|dean/i)

    await link.click()
    await expect(page).toHaveURL(/\/@deanMaye$/)
  })

  /*
   * The creators band runs edge to edge.
   *
   * It is a full-bleed section outside the content column precisely so the
   * colour does not stop at the 72rem ceiling — inset, it would read as a
   * very wide card rather than as a band across the page. That is a single
   * nesting level away from being wrong and nothing about the phone layout
   * would show it, so it is checked at a desktop width where the ceiling
   * actually engages.
   */
  test('gives its bands both edges of the screen', async ({ page }) => {
    const measure = () =>
      page.evaluate(() => {
        const el = [...document.querySelectorAll('section')].find((s) =>
          s.className.includes('bg-ink'),
        )
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { left: Math.round(r.left), width: Math.round(r.width), viewport: window.innerWidth }
      })

    await page.setViewportSize({ width: 1280, height: 800 })

    // Both bands, because they are the same construction and fail the same
    // way — the feed's behind its creators row, the project's behind its
    // hero.
    await gotoFeed(page)
    const feedBand = await measure()
    expect(feedBand, 'no bg-ink band behind the creators row').not.toBeNull()
    expect(feedBand!.left).toBe(0)
    expect(feedBand!.width).toBe(feedBand!.viewport)

    await page.goto('/@deanMaye/atonomos')
    await page.getByRole('heading', { name: 'Atonomos' }).waitFor()
    const hubBand = await measure()
    expect(hubBand, 'no bg-ink band behind the project hero').not.toBeNull()
    expect(hubBand!.left).toBe(0)
    expect(hubBand!.width).toBe(hubBand!.viewport)
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
   * The menu sits on the right on EVERY screen — a control that moves
   * between pages is one you have to hunt for. Only the left slot varies:
   * search on the feed, a way back on a screen below it.
   *
   * Asserted by position, not just presence, because "it exists somewhere in
   * the header" is exactly the bug this replaced.
   */
  test('keeps the menu on the right, whatever the left slot holds', async ({ page }) => {
    const centreOf = async (name: RegExp) => {
      const box = (await page.getByRole('button', { name }).boundingBox())!
      return box.x + box.width / 2
    }

    await gotoFeed(page)
    const feedWidth = page.viewportSize()!.width
    expect(await centreOf(/open menu/i)).toBeGreaterThan(feedWidth / 2)
    expect(await centreOf(/^Search$/)).toBeLessThan(feedWidth / 2)
    await expect(page.getByRole('button', { name: /^Back$/ })).toHaveCount(0)

    await gotoCreator(page)
    expect(await centreOf(/open menu/i)).toBeGreaterThan(feedWidth / 2)
    expect(await centreOf(/^Back$/)).toBeLessThan(feedWidth / 2)

    await page.getByRole('button', { name: /^Back$/ }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  /*
   * The header must stay put on EVERY screen. It was silently not sticking
   * on the profile: that screen wrapped its content in `overflow-hidden`
   * (left over from a blurred cover wash it no longer has), and an ancestor
   * that clips overflow also becomes the containing block for
   * `position: sticky` — so the bar scrolled away there and nowhere else.
   */
  test('stays pinned to the top while the page scrolls', async ({ page }) => {
    for (const go of [gotoFeed, gotoCreator]) {
      await go(page)
      const header = page.locator('header').first()
      const topBefore = (await header.boundingBox())!.y

      await page.mouse.move(195, 450)
      await page.mouse.wheel(0, 600)
      await page.waitForTimeout(400)

      expect((await header.boundingBox())!.y).toBeCloseTo(topBefore, 0)
    }
  })

  // The drawer must arrive from the edge its button lives on.
  test('the drawer opens from the right edge', async ({ page }) => {
    await gotoFeed(page)
    await page.getByRole('button', { name: /open menu/i }).click()
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav).toBeVisible()

    const width = page.viewportSize()!.width

    // Polled, not sampled once: the panel slides in, and `toBeVisible`
    // passes the moment it is in the DOM — which is while it is still
    // mostly off-screen. Settling on the right edge is the assertion.
    await expect
      .poll(async () => {
        const box = (await nav.boundingBox())!
        return Math.round(box.x + box.width)
      })
      .toBe(width)

    // And it is a panel, not a full-screen takeover.
    expect((await nav.boundingBox())!.x).toBeGreaterThan(0)
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

  /*
   * The feed does not filter itself any more; searching is its own screen.
   * Asserted because the old behaviour was convincing and wrong — it hid
   * rows this page had already loaded, which looks like search right up
   * until the thing you want was never loaded.
   */
  test('leaves searching to the search screen', async ({ page }) => {
    await gotoFeed(page)
    const rows = page.getByTestId('feed-rows').getByRole('button')
    const before = await rows.count()

    const search = await openSearch(page)
    await search.fill('bronze')
    // The feed behind the overlay is untouched.
    expect(await rows.count()).toBe(before)
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
    await expect(page).toHaveURL(/\/@deanMaye$/)
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
      await page.goto(`/@deanMaye/${seg}`)
      await expect(page).toHaveURL(new RegExp(`/@deanMaye/${seg}$`))
    }
  })

  /*
   * Creator sections share a path segment with project slugs, so the router
   * must match sections first. A project called `store` is rejected by both
   * RESERVED_PROJECT_SLUGS and a CHECK constraint, which is what makes this
   * ordering safe rather than merely lucky.
   */
  test('creator sections resolve ahead of project slugs', async ({ page }) => {
    await page.goto('/@deanMaye/store')
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
    await expect(page).toHaveURL(/\/@deanMaye\/bronze$/)
    await expect(page.getByRole('button', { name: /^Music/ })).toBeVisible()
  })

  test('the music interface is a segment below the project', async ({ page }) => {
    await gotoProject(page)
    await page.getByRole('button', { name: /^Music/ }).click()
    await expect(page).toHaveURL(/\/@deanMaye\/bronze\/music$/)
  })

  test('the whitepaper project resolves and offers its reader', async ({ page }) => {
    await page.goto('/@deanMaye/atonomos')
    await expect(page.getByRole('heading', { name: 'Atonomos' }).first()).toBeVisible()
    await page.getByRole('button', { name: /^Read/ }).click()
    await expect(page).toHaveURL(/\/@deanMaye\/atonomos\/read$/)
  })

  test('shows an honest empty state for an unknown project', async ({ page }) => {
    await page.goto('/@deanMaye/no-such-project')
    await expect(page.getByText(/No project called/)).toBeVisible()
  })

  test('an unknown interface type is not found rather than blank', async ({ page }) => {
    await page.goto('/@deanMaye/bronze/tapdance')
    await expect(page.getByText(/No section called/)).toBeVisible()
  })
})
