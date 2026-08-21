import { expect, test } from '@playwright/test'
import { gotoContentHome } from './helpers'

test.describe('content home layout', () => {
  test('has a plain background, with no blurred cover behind it', async ({ page }) => {
    await gotoContentHome(page)

    const blurred = await page.evaluate(
      () =>
        [...document.querySelectorAll('*')].filter((el) => {
          const s = getComputedStyle(el)
          return s.filter.includes('blur') || s.backdropFilter !== 'none'
        }).length,
    )
    expect(blurred).toBe(0)

    const bg = await page
      .locator('.grain')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(10, 7, 5)')
  })

  test('shows the cover as a thumbnail on the right of the title card', async ({ page }) => {
    await gotoContentHome(page)

    const header = page.locator('header')
    const thumb = header.locator('img')
    await expect(thumb).toBeVisible()
    await expect(thumb).toHaveAttribute('alt', /Bronze cover/i)

    // Real artwork, not a broken or empty image.
    expect(await thumb.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)

    const box = (await thumb.boundingBox())!
    expect(Math.round(box.width)).toBe(96)
    expect(Math.round(box.height)).toBe(96)

    // To the right of the title, and inside the card.
    const title = (await page.getByRole('heading', { name: 'Bronze' }).boundingBox())!
    const card = (await header.boundingBox())!
    expect(box.x).toBeGreaterThan(title.x + title.width - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 1)
  })
})
