import { expect, test } from '@playwright/test'
import { gotoCreator } from './helpers'

/**
 * The page header on a music release — the band carrying the title, not the
 * app's own bar above it. Where a Project supplies art, the band wears it
 * full-bleed and the title turns `on-media` white to sit on it.
 */
test.describe('music page header', () => {
  test('wears the release’s own art, full-bleed', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const art = page.locator('section img[alt=""]').first()
    await expect(art).toBeVisible()
    await expect(art).toHaveAttribute('src', /bronze-back/)

    // Full-bleed means both edges: the band reaches them even though the
    // title inside it keeps the page's own margin.
    const band = page.locator('section').first()
    const box = await band.boundingBox()
    const width = page.viewportSize()!.width
    expect(box!.x).toBe(0)
    expect(Math.round(box!.width)).toBe(width)
  })

  test('sets the title in white against the art', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const title = page.getByRole('heading', { name: 'Bronze', level: 1 })
    const [r, g, b] = (await title.evaluate((e) => getComputedStyle(e).color))
      .match(/[\d.]+/g)!
      .map(Number)
    expect(r).toBeGreaterThan(240)
    expect(g).toBeGreaterThan(240)
    expect(b).toBeGreaterThan(240)
  })

  /*
   * The app bar is NOT dressed by this. It is a shared component that looks
   * the same on every screen, and an earlier pass put the art behind it —
   * which made the bar's own near-black chrome answer for one album's
   * near-black photograph.
   */
  test('leaves the app bar alone', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const back = page.getByRole('button', { name: 'Back' })
    const [r, g, b] = (await back.evaluate((e) => getComputedStyle(e).color))
      .match(/[\d.]+/g)!
      .map(Number)
    // The light theme's ink, unchanged — not the white the band's title uses.
    expect(r).toBeLessThan(60)
    expect(g).toBeLessThan(60)
    expect(b).toBeLessThan(60)
  })

  test('the app bar still pins to the top on scroll', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    await page.waitForTimeout(300)
    await page.evaluate(() => document.querySelector('[data-app-scroll]')?.scrollTo(0, 400))
    await page.waitForTimeout(300)
    const box = await page.locator('header').boundingBox()
    expect(box?.y).toBe(0)
  })
})
