import { expect, test } from '@playwright/test'
import { gotoFeed } from './helpers'

/**
 * Share is real, unlike the heart and the comment glyph beside it: there is
 * a link worth sending even without accounts, so this is the one control
 * of the three that does what it looks like it does.
 *
 * `navigator.share` is unavailable in this browser project, so every case
 * here exercises the clipboard fallback — the path a desktop visitor
 * actually takes. What the Share Sheet branch would do differently is not
 * something an automated Chromium run can observe.
 */
test.describe('share', () => {
  const row = (page: import('@playwright/test').Page, n = 0) => page.getByTestId('feed-row').nth(n)
  const shareButton = (page: import('@playwright/test').Page, n = 0) =>
    row(page, n).getByRole('button', { name: /^Share/ })

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test('copies the content link to the clipboard', async ({ page }) => {
    await gotoFeed(page)
    await shareButton(page, 1).click()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toMatch(/\/@deanMaye\/bronze\/music$/)
  })

  /*
   * The glyph swaps to a checkmark on the control itself, since there is
   * nowhere else in this app to put a "copied" confirmation.
   */
  test('turns the glyph into a checkmark, then back', async ({ page }) => {
    await gotoFeed(page)
    const b = shareButton(page)
    const idle = await b.evaluate((e) => getComputedStyle(e).color)
    await b.click()
    // Tailwind v4 renders these as oklab(), not rgb() — comparing the raw
    // computed string is what stays honest about which colour actually
    // painted, rather than a value this test guessed at.
    await expect.poll(() => b.evaluate((e) => getComputedStyle(e).color)).not.toBe(idle)
    await expect
      .poll(() => b.evaluate((e) => getComputedStyle(e).color), { timeout: 3000 })
      .toBe(idle)
  })

  test('does not open the content', async ({ page }) => {
    await gotoFeed(page)
    const url = page.url()
    await shareButton(page).click()
    await expect(page).toHaveURL(url)
  })
})
