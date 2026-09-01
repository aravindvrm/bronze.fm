import { expect, test } from '@playwright/test'
import { gotoFeed } from './helpers'

/**
 * The comment glyph does nothing — there is nowhere yet for a comment to
 * go, since the app has no accounts to write one as. What this checks is
 * that it SAYS so, rather than sitting there as a control that silently
 * fails when pressed.
 */
test('comment control is marked disabled and does not navigate', async ({ page }) => {
  await gotoFeed(page)
  const button = page
    .getByTestId('feed-row')
    .first()
    .getByRole('button', { name: /coming soon$/ })

  await expect(button).toHaveAttribute('aria-disabled', 'true')

  // Playwright's own actionability check refuses a plain click on an
  // aria-disabled element — the same signal assistive technology gets —
  // so a stray tap is forced through to prove the handler itself is inert
  // rather than relying on the click never landing.
  const url = page.url()
  await button.click({ force: true })
  await expect(page).toHaveURL(url)
})
