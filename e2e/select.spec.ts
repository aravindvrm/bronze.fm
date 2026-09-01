import { expect, test } from '@playwright/test'
import { gotoFeed } from './helpers'

/**
 * The feed's type filter, and the app's first dropdown.
 *
 * It replaced a row of chips, which read well at three content types and
 * fall apart at eight — a header has room for one control, not a row that
 * wraps or scrolls. What is asserted here is mostly the behaviour a native
 * `<select>` would have given for free and this one has to implement:
 * keyboard operation, dismissal, and focus going back where it came from.
 */
test.describe('feed type filter', () => {
  const trigger = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Filter by type' })

  test('filters the feed, and says how much of each there is', async ({ page }) => {
    await gotoFeed(page)
    const rows = page.getByTestId('feed-rows').getByTestId('feed-row')
    const all = await rows.count()
    expect(all).toBeGreaterThan(1)

    await trigger(page).click()
    // The count belongs to the feed, not to the current search — it is the
    // question people open a type filter to ask.
    await expect(page.getByRole('option', { name: /^All/ })).toContainText(String(all))

    await page.getByRole('option', { name: /^Music/ }).click()
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(trigger(page)).toHaveText(/Music/)
    expect(await rows.count()).toBeLessThan(all)
  })

  test('works from the keyboard alone', async ({ page }) => {
    await gotoFeed(page)
    await trigger(page).focus()

    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(trigger(page)).not.toHaveText(/All/)
  })

  test('closes on Escape and on a tap outside, returning focus', async ({ page }) => {
    await gotoFeed(page)

    await trigger(page).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toBeHidden()
    // Focus back on the trigger, or a keyboard user is dropped at the top of
    // the document every time they change their mind.
    await expect(trigger(page)).toBeFocused()

    await trigger(page).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.mouse.click(40, 420)
    await expect(page.getByRole('listbox')).toBeHidden()
  })
})
