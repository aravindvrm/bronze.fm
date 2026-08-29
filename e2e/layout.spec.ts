import { expect, test } from '@playwright/test'
import { gotoProject } from './helpers'

test.describe('project hub layout', () => {
  test('has a plain background, with no blurred cover behind it', async ({ page }) => {
    await gotoProject(page)

    /*
     * The creator profile deliberately runs a blurred cover wash behind its
     * content; the project hub deliberately does not, because it sits on a
     * solid background where a blur would cost a paint and change nothing.
     *
     * Only `filter: blur` counts here. The sticky header uses backdrop-blur so
     * content scrolling under it stays legible, which is chrome rather than a
     * background wash — including it would make this assert the opposite of
     * what it means.
     */
    const washes = await page.evaluate(
      () =>
        [...document.querySelectorAll('*')].filter((el) =>
          getComputedStyle(el).filter.includes('blur'),
        ).length,
    )
    expect(washes).toBe(0)

    // body carries the page-level background (index.css sets it from
    // --color-void directly), so this holds regardless of which wrapper
    // element the screen itself uses. Compared against a probe element
    // styled from the same token, rather than a hardcoded literal, so this
    // doesn't need updating every time the palette does.
    const { bg, tokenBg } = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.background = 'var(--color-void)'
      document.body.appendChild(probe)
      const tokenBg = getComputedStyle(probe).backgroundColor
      probe.remove()
      return { bg: getComputedStyle(document.body).backgroundColor, tokenBg }
    })
    expect(bg).toBe(tokenBg)
  })

  test('shows the cover as a thumbnail on the right of the title card', async ({ page }) => {
    await gotoProject(page)

    // Scoped by the alt text rather than by `header`: the screen now has two,
    // the sticky nav bar and this title card.
    const thumb = page.getByAltText(/Bronze cover/i)
    const card = page.locator('header').filter({ has: thumb })

    await expect(thumb).toBeVisible()

    // Real artwork, not a broken or empty image.
    expect(await thumb.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)

    const box = (await thumb.boundingBox())!
    expect(Math.round(box.width)).toBe(96)
    expect(Math.round(box.height)).toBe(96)

    // To the right of the title, and inside the card.
    const title = (await card.getByRole('heading', { name: 'Bronze' }).boundingBox())!
    const cardBox = (await card.boundingBox())!
    expect(box.x).toBeGreaterThan(title.x + title.width - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1)
  })
})
