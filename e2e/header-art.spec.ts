import { expect, test, type Page } from '@playwright/test'
import { gotoCreator } from './helpers'

/**
 * A Project's own art, behind the page header on the two screens that show
 * one. Keyed by slug in lib/cover.ts, so a Project without art is not
 * decorated with somebody else's.
 *
 * Contrast is what these mostly guard. The art is a near-black interior
 * carrying candle flames and a lit city window — sampled, its brightest
 * thousandth reaches 0.58 relative luminance, which is bright enough to
 * swallow any mid-tone. Everything written on it is white for that reason,
 * and the assertions check the painted colour rather than a class name.
 */
const white = async (page: Page, sel: () => Promise<string>) => {
  const [r, g, b] = (await sel()).match(/[\d.]+/g)!.map(Number)
  return r > 240 && g > 240 && b > 240
}

test.describe('music page header', () => {
  test('wears the release’s own art, full-bleed', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const art = page.getByTestId('header-art')
    await expect(art).toBeVisible()
    await expect(art).toHaveAttribute('src', /bronze-back/)

    const box = await page.locator('section').first().boundingBox()
    expect(box!.x).toBe(0)
    expect(Math.round(box!.width)).toBe(page.viewportSize()!.width)
  })

  test('sets the title in white against the art', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const title = page.getByRole('heading', { name: 'Bronze', level: 1 })
    expect(await white(page, () => title.evaluate((e) => getComputedStyle(e).color))).toBe(true)
  })

  test('leaves the app bar alone', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    const back = page.getByRole('button', { name: 'Back' })
    const [r] = (await back.evaluate((e) => getComputedStyle(e).color))
      .match(/[\d.]+/g)!
      .map(Number)
    expect(r).toBeLessThan(60)
  })

  test('the app bar still pins to the top on scroll', async ({ page }) => {
    await gotoCreator(page, '/bronze/music')
    await page.waitForTimeout(300)
    await page.evaluate(() => document.querySelector('[data-app-scroll]')?.scrollTo(0, 400))
    await page.waitForTimeout(300)
    expect((await page.locator('header').boundingBox())?.y).toBe(0)
  })
})

test.describe('project hub header', () => {
  test('wears the same art, and drops the cover thumbnail', async ({ page }) => {
    await gotoCreator(page, '/bronze')
    const band = page.locator('section').first()
    await expect(page.getByTestId('header-art')).toHaveAttribute('src', /bronze-back/)
    // The front cover was art sitting on art. Nothing in the band carries a
    // cover alt any more.
    await expect(band.locator('img[alt$="cover"]')).toHaveCount(0)
  })

  /*
   * Both of these were ink-on-grey before, and both would have been
   * unreadable left alone — the title near-black on near-black, the
   * creator's name in an accent that measures under 2:1 on this photo's
   * bright areas.
   */
  test('writes the title and the creator’s name in white', async ({ page }) => {
    await gotoCreator(page, '/bronze')
    const title = page.getByRole('heading', { name: 'Bronze', level: 1 })
    expect(await white(page, () => title.evaluate((e) => getComputedStyle(e).color))).toBe(true)

    const name = page.getByText('Dean Maye', { exact: true })
    expect(await white(page, () => name.evaluate((e) => getComputedStyle(e).color))).toBe(true)
  })

  /*
   * The isolation the slug lookup buys. Atonomos registers no art, so it
   * keeps the flat band and the ink-on-grey it always had — a Project must
   * not inherit another's photograph.
   */
  test('a project without art keeps the flat band', async ({ page }) => {
    await gotoCreator(page, '/atonomos')
    const band = page.locator('section').first()
    await expect(page.getByTestId('header-art')).toHaveCount(0)

    const title = page.getByRole('heading', { name: 'Atonomos', level: 1 })
    expect(await white(page, () => title.evaluate((e) => getComputedStyle(e).color))).toBe(false)
  })
})
