import { expect, test } from '@playwright/test'
import { gotoCreator } from './helpers'

/**
 * Bronze's header art, and the contrast problem it creates: the header's
 * own chrome (back, search, wordmark, menu) is `text-parchment`, which is
 * near-black in the light theme — legible on the plain page ground it
 * normally sits on, invisible against this specific photo, which is almost
 * entirely near-black itself.
 */
test.describe('music header background', () => {
  const SCROLLER = '[data-app-scroll]'

  test('shows Bronze’s own art behind the bar', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const img = page.locator('header ~ img, img[alt=""]').first()
    await expect(img).toBeVisible()
    await expect(img).toHaveAttribute('src', /bronze-back/)
  })

  /*
   * The chrome swaps to a fixed light colour while the art shows, rather
   * than the theme's normal near-black — asserted as a real colour change
   * rather than a class name, since the fixed token and an accidental
   * near-white are both "not black" and only one of them is correct.
   */
  test('lightens the header chrome to read against the art', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const back = page.getByRole('button', { name: 'Back' })
    const color = await back.evaluate((e) => getComputedStyle(e).color)
    // white, or near enough — the exact string is a Tailwind/oklch build
    // detail this test should not pin to.
    const [r, g, b] = color.match(/[\d.]+/g)!.map(Number)
    expect(r).toBeGreaterThan(240)
    expect(g).toBeGreaterThan(240)
    expect(b).toBeGreaterThan(240)
  })

  /*
   * The bug this whole feature nearly shipped with: wrapping the header in
   * a div sized to just its own height broke `position: sticky`, because
   * sticky can only stay pinned as far as its containing block extends.
   */
  test('stays pinned to the top on scroll, like every other header', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    await page.waitForTimeout(300)
    await page.evaluate((sel) => document.querySelector(sel)?.scrollTo(0, 400), SCROLLER)
    await expect(page.locator('header')).toHaveCSS('top', '0px')
    const box = await page.locator('header').boundingBox()
    expect(box?.y).toBe(0)
  })

  /*
   * Once scrolled, the header takes its own translucent tint over
   * whatever's behind it — the art has scrolled away by then, and the
   * fixed light chrome would be unreadable against light theme's pale
   * tint. It has to hand back to the normal theme-aware colour.
   */
  test('returns the chrome to normal once scrolled past the art', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    await page.waitForTimeout(300)
    const back = page.getByRole('button', { name: 'Back' })
    const before = await back.evaluate((e) => getComputedStyle(e).color)

    await page.evaluate((sel) => document.querySelector(sel)?.scrollTo(0, 400), SCROLLER)
    await page.waitForTimeout(300)
    const after = await back.evaluate((e) => getComputedStyle(e).color)

    expect(after).not.toBe(before)
  })
})
