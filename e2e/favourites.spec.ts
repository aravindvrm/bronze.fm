import { expect, test } from '@playwright/test'
import { gotoFeed } from './helpers'

/**
 * The heart is a placeholder: there are no accounts yet, so a favourite has
 * nobody to belong to. What is asserted here is the part that is real —
 * that it toggles, that it says so to assistive technology, and that it
 * does not fight the row it sits in.
 */
test.describe('favourites', () => {
  const heart = (page: import('@playwright/test').Page, n = 0) =>
    page
      .getByTestId('feed-row')
      .nth(n)
      .getByRole('button', { name: /favourites$/ })

  test('fills on tap and empties on a second tap', async ({ page }) => {
    await gotoFeed(page)
    const h = heart(page)
    await expect(h).toHaveAttribute('aria-pressed', 'false')

    await h.click()
    await expect(h).toHaveAttribute('aria-pressed', 'true')
    // The colour is the whole point of the control, and it is the thing a
    // refactor to a shared icon component would quietly drop.
    await expect(h).toHaveCSS('color', 'rgb(224, 36, 94)')

    await h.click()
    await expect(h).toHaveAttribute('aria-pressed', 'false')
  })

  /*
   * The reason this is a store and not `useState` in the row. The feed
   * unmounts on navigation, so a heart held in the component would clear
   * itself on the way back and read as a broken toggle rather than as the
   * missing backend it actually is.
   */
  test('survives leaving the feed and coming back', async ({ page }) => {
    await gotoFeed(page)
    await heart(page).click()
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('feed-row').first().click()
    await expect(page).not.toHaveURL(/\/$/)
    await page.goBack()

    await expect(heart(page)).toHaveAttribute('aria-pressed', 'true')
  })

  /*
   * Two controls in one row, and the smaller one must not trigger the
   * larger. The row's action is a button stretched behind the whole row, so
   * without the heart sitting above it a tap on the heart would navigate.
   */
  test('hearting does not open the content', async ({ page }) => {
    await gotoFeed(page)
    const url = page.url()
    await heart(page).click()
    await expect(page).toHaveURL(url)
  })

  test('each row keeps its own state', async ({ page }) => {
    await gotoFeed(page)
    await heart(page, 0).click()
    await expect(heart(page, 0)).toHaveAttribute('aria-pressed', 'true')
    await expect(heart(page, 1)).toHaveAttribute('aria-pressed', 'false')
  })
})
