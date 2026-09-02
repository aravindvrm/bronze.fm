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

  /*
   * The cover thumbnail used to sit to the right of the title here, and is
   * gone: the band behind the title carries the release's own back cover
   * now, and the front cover on top of it was art laid over art.
   *
   * Kept as a test rather than deleted, inverted — the thumbnail's absence
   * is the deliberate part, and a screen that quietly grows a second piece
   * of artwork again should have to argue with something.
   */
  test('carries no cover thumbnail beside the title', async ({ page }) => {
    await gotoProject(page)
    await expect(page.getByAltText(/Bronze cover/i)).toHaveCount(0)

    // The band itself is still there, wearing the art.
    await expect(page.getByTestId('header-art')).toHaveAttribute('src', /bronze-back/)
  })
})
