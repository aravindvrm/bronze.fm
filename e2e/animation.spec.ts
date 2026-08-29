import { expect, test } from '@playwright/test'
import { act, gotoContent, gotoProject, playTrack } from './helpers'

/**
 * These exist because animation was the one thing that could not be verified
 * during development: the automated preview runs with
 * `visibilityState: "hidden"`, so rAF never fires and Framer Motion pins every
 * animation at its `initial` value. Two non-existent bugs were chased as a
 * result. Here frames actually tick, so "does it finish" is answerable.
 */

const playerBox = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) =>
      (d.className || '').toString().includes('z-50'),
    )
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { y: Math.round(r.y), height: Math.round(r.height), transform: getComputedStyle(el).transform }
  })

test.describe('animation', () => {
  test('the full player slides all the way in, not partway', async ({ page }) => {
    await gotoContent(page)
    await playTrack(page, 1)
    await act(page, 'setExpanded', true)

    await expect
      .poll(async () => (await playerBox(page))?.y, { timeout: 5000 })
      .toBe(0)

    const box = await playerBox(page)
    expect(box!.height).toBe(page.viewportSize()!.height)
    // Settled means the transform resolved to identity, not stuck mid-spring.
    expect(box!.transform === 'none' || box!.transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true)
  })

  test('the player unmounts after collapsing', async ({ page }) => {
    // A stuck exit animation would leave a stale node covering the app.
    await gotoContent(page)
    await playTrack(page, 1)
    await act(page, 'setExpanded', true)
    await expect.poll(async () => (await playerBox(page))?.y, { timeout: 5000 }).toBe(0)

    await page.getByRole('button', { name: 'Close player' }).click()
    await expect.poll(async () => await playerBox(page), { timeout: 5000 }).toBeNull()
  })

  test('the queue panel settles fully open', async ({ page }) => {
    await gotoContent(page)
    await playTrack(page, 1)
    await act(page, 'setExpanded', true)
    await expect.poll(async () => (await playerBox(page))?.y, { timeout: 5000 }).toBe(0)

    await page.getByRole('button', { name: 'Show track list' }).click()

    const queueY = async () =>
      page.evaluate(() => {
        const el = document.querySelector('[class*="z-10"]')
        return el ? Math.round(el.getBoundingClientRect().y) : null
      })
    await expect.poll(queueY, { timeout: 5000 }).toBe(0)
    await expect(page.getByRole('button', { name: 'Close track list' })).toBeVisible()
  })

  // The hub lists the interfaces the project actually holds, so Bronze shows
  // one. Store and Events moved to creator level (PLAN.md §8.2) and Videos
  // exists only when a project has video content.
  test('project hub tiles finish their staggered entrance', async ({ page }) => {
    await gotoProject(page)
    for (const label of ['Music']) {
      const tile = page.getByRole('button', { name: new RegExp(`^${label}`) })
      await expect(tile).toBeVisible()
      // Frozen mid-stagger they would sit at opacity 0.
      await expect
        .poll(async () => Number(await tile.evaluate((el) => getComputedStyle(el).opacity)), {
          timeout: 5000,
        })
        .toBeGreaterThan(0.99)
    }
  })

  // The per-release splash is gone (PLAN.md §8.1); the project hub is now the
  // entry screen for a body of work, so its title is what must land.
  test('the project title reaches full opacity', async ({ page }) => {
    await gotoProject(page)
    // Two headings carry the title now — the sticky nav bar and the title
    // card. The card's is the one that animates in.
    const title = page.locator('header').last().getByRole('heading', { name: 'Bronze' })
    await expect
      .poll(async () => Number(await title.evaluate((el) => getComputedStyle(el).opacity)), {
        timeout: 5000,
      })
      .toBeGreaterThan(0.99)
  })
})
