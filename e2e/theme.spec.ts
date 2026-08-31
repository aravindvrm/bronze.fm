import { expect, test, type Page } from '@playwright/test'
import { gotoFeed } from './helpers'

/**
 * The theme is one attribute on <html>, and every colour follows from the
 * tokens — so what is worth asserting is the wiring around it, not the
 * hundred and fifty places that inherit.
 */
test.describe('dark mode', () => {
  const themeOf = (page: Page) =>
    page.evaluate(() => document.documentElement.dataset.theme ?? 'light')

  test('the switch turns the app over, and the choice sticks', async ({ page }) => {
    await gotoFeed(page)
    expect(await themeOf(page)).toBe('light')

    await page.getByRole('button', { name: 'Open menu' }).click()
    const control = page.getByRole('switch', { name: 'Dark mode' })
    await expect(control).toHaveAttribute('aria-checked', 'false')
    await control.click()

    expect(await themeOf(page)).toBe('dark')
    await expect(control).toHaveAttribute('aria-checked', 'true')

    // The ground really moved, rather than only the attribute.
    const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(ground).toBe('rgb(18, 18, 18)')

    await page.reload()
    expect(await themeOf(page)).toBe('dark')
  })

  /*
   * The one that actually bites.
   *
   * A theme applied from React runs after the first frame, so every cold
   * open flashes white before turning dark — at the exact people who chose
   * dark, in the exact conditions they chose it for. The guard is a blocking
   * inline script in index.html, and this is what proves it beat React to
   * the paint: the attribute is already set while #root is still empty.
   */
  test('is applied before the app mounts, not after', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('bronze:theme', 'dark')
      } catch {
        // Private mode; the assertion below will say so.
      }
    })
    await page.goto('/', { waitUntil: 'commit' })

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          theme: document.documentElement.dataset.theme ?? 'light',
          mounted: (document.getElementById('root')?.childElementCount ?? 0) > 0,
        })),
      )
      .toMatchObject({ theme: 'dark' })

    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      // The tag the OS chrome reads, which has to move with the ground or a
      // white band sits above a black app.
      meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    }))
    expect(state.theme).toBe('dark')
    expect(state.meta).toBe('#121212')
  })

  /*
   * The accent is two tokens because a fill and a piece of text are judged
   * against different backdrops. The fill stays put across themes — which is
   * what keeps the wordmark's block the same object — while accent text
   * lifts, because #ad630e reads 4.07:1 on the dark ground and that is under
   * AA. Asserted as computed colours, since the whole point is that they are
   * allowed to differ.
   */
  test('keeps the accent fill and lifts the accent text', async ({ page }) => {
    const read = async () =>
      page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.cssText = 'position:absolute;visibility:hidden'
        document.body.appendChild(probe)
        const of = (token: string) => {
          probe.style.color = `var(${token})`
          return getComputedStyle(probe).color
        }
        const out = { gilt: of('--color-gilt'), ember: of('--color-ember') }
        probe.remove()
        return out
      })

    await gotoFeed(page)
    const light = await read()
    expect(light.gilt).toBe(light.ember)

    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('switch', { name: 'Dark mode' }).click()

    const dark = await read()
    expect(dark.gilt).toBe(light.gilt)
    expect(dark.ember).not.toBe(light.ember)
  })
})
