import { expect, test } from '@playwright/test'
import { gotoCreator, snapshot } from './helpers'

test.describe('pinned content', () => {
  test('lists the creator’s curation in order', async ({ page }) => {
    await gotoCreator(page)
    // Pinned is the profile's default tab, so it is already on screen.
    const pinned = page.getByTestId('panel-pinned')
    await expect(pinned.getByRole('button')).toHaveCount(3)
    await expect(pinned).toContainText('Summer Flame')
    await expect(pinned).toContainText('Autonomous: The Agentic Enterprise')
  })

  /*
   * A pinned track plays in place rather than navigating: the pin is a way to
   * hear the thing, not a link to a page about it. It must also load the whole
   * album as the queue, or playback would have nothing to advance into.
   */
  test('a pinned track plays without leaving the profile', async ({ page }) => {
    await gotoCreator(page)
    const url = page.url()

    await page.getByRole('button', { name: /Summer Flame/ }).click()
    await page.waitForFunction(() => (window as never as { __player: { getState: () => { isPlaying: boolean } } }).__player.getState().isPlaying, undefined, { timeout: 10_000 })

    expect(page.url()).toBe(url)
    const state = await snapshot(page)
    expect(state.itemTitle).toBe('Summer Flame')
    expect(state.queueLength).toBeGreaterThan(1)
  })

  test('a pinned document opens its reader', async ({ page }) => {
    await gotoCreator(page)
    await page.getByRole('button', { name: /Autonomous/ }).click()
    await expect(page).toHaveURL(/\/@dean\/atonomos\/read$/)
  })
})

test.describe('splash', () => {
  // Tap-gated, not timed — the mechanic the per-release splash had before
  // the restructure. It must not clear on its own: sitting there is exactly
  // what "wait for the gesture" means.
  test('covers the root on a cold open and stays until tapped', async ({ page }) => {
    await page.goto('/')
    const splash = page.locator('.z-\\[60\\]')
    await expect(splash).toBeVisible()
    await expect(page.getByText('Tap to enter')).toBeVisible()

    await page.waitForTimeout(3000)
    await expect(splash).toBeVisible()

    await splash.click()
    await expect(splash).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Featured Creators' })).toBeVisible()
  })

  /*
   * The wordmark assembles letter by letter over ~2.9s. That reveal is
   * decoration and must never become a gate: a visitor who taps while it is
   * still running gets in immediately, exactly as one who waits.
   */
  test('lets you in mid-reveal, without waiting for the animation', async ({ page }) => {
    await page.goto('/')
    const splash = page.locator('.z-\\[60\\]')
    await expect(splash).toBeVisible()

    // Well before the last letter has landed.
    await page.waitForTimeout(300)
    await splash.click()
    await expect(splash).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Featured Creators' })).toBeVisible()
  })

  test('shows the full wordmark once the reveal settles', async ({ page }) => {
    await page.goto('/')
    // role=img, not a heading: the feed underneath owns the page's h1.
    const mark = page.getByRole('img', { name: 'bronze.fm' })
    await expect(mark).toBeVisible()
    // Every letter present, and none left stranded mid-flight.
    await expect(mark).toHaveText(/B\s*R\s*O\s*N\s*Z\s*E\s*\.\s*F\s*M/)
    await expect
      .poll(async () =>
        mark.evaluate((el) =>
          [...el.querySelectorAll('span')].every(
            (s) => getComputedStyle(s).opacity === '1',
          ),
        ),
      )
      .toBe(true)
  })

  /*
   * The drifting field belongs to the splash and to nowhere else.
   *
   * Both halves are asserted. The canvas is worth pinning because its
   * failure mode is silent — a mis-keyed option or a provider that refuses
   * to mount leaves a blank white screen rather than an error. And the app
   * behind it is deliberately plain: the field was moved off it because
   * movement behind everything you read is a distraction, so a second
   * canvas reappearing anywhere is a regression, not a bonus.
   */
  test('is the only place the drifting field appears', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('img', { name: 'bronze.fm' })).toBeVisible()
    await expect(page.locator('#splash-field canvas')).toHaveCount(1)

    await page.locator('.z-\\[60\\]').click()
    await expect(page.getByRole('heading', { name: 'Featured Creators' })).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  /*
   * The tagline types itself out. Assistive technology gets the finished
   * sentence from a visually-hidden copy rather than a line that changes on
   * every keystroke, so this asserts the accessible text is whole from the
   * start while the visible copy is still filling in.
   */
  test('announces the whole tagline while it is still typing', async ({ page }) => {
    await page.goto('/')
    const line = page.locator('p.font-mono').first()
    await expect(line).toContainText('Create. Share. Thrive.')
    await expect
      .poll(async () =>
        line.evaluate(
          (el) =>
            el.querySelector('span[aria-hidden] > span:last-child')?.textContent?.trim(),
        ),
      )
      .toBe('Create. Share. Thrive.')
  })

  test('does not reappear within the same session once entered', async ({ page }) => {
    await page.goto('/')
    await page.locator('.z-\\[60\\]').click()
    await expect(page.locator('.z-\\[60\\]')).toBeHidden()
    await page.reload()
    await expect(page.locator('.z-\\[60\\]')).toHaveCount(0)
  })

  // "Seen" is written on the dismissing tap, not on mount — otherwise a
  // reload before ever tapping would lose the splash on retry, which breaks
  // the tap gate rather than merely skipping a rewatch.
  test('reappears on reload if the visitor reloads before tapping', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.z-\\[60\\]')).toBeVisible()
    await page.reload()
    await expect(page.locator('.z-\\[60\\]')).toBeVisible()
  })

  // A deep link is someone arriving at a specific thing, usually from a shared
  // URL; holding that behind a tap gate would be friction with no purpose.
  test('never covers a deep link', async ({ page }) => {
    await page.goto('/@dean/bronze')
    await expect(page.locator('.z-\\[60\\]')).toHaveCount(0)
  })
})

test.describe('reader', () => {
  test('renders the paper as semantic blocks, not a blob', async ({ page }) => {
    await page.goto('/@dean/atonomos/read')
    const article = page.locator('article')
    await expect(article.getByRole('heading', { name: 'Introduction' })).toBeVisible()

    // Structure survived the docx conversion: headings at more than one
    // level, real paragraphs, and lists kept as lists rather than flattened.
    expect(await article.locator('h2, h3, h4').count()).toBeGreaterThan(5)
    expect(await article.locator('p').count()).toBeGreaterThan(50)
    expect(await article.locator('ul').count()).toBeGreaterThan(0)
  })

  test('the hub advertises a read time once the paper has text', async ({ page }) => {
    await page.goto('/@dean/atonomos')
    await expect(page.getByRole('button', { name: /^Read/ })).toContainText(/min read/)
  })
})

test.describe('creator identity', () => {
  /*
   * The avatar used to be borrowed from the first Project's cover art, which
   * meant Dean's photo was literally the Bronze album artwork — this asserts
   * the avatar is his own image, not a project cover.
   */
  test('shows the creator’s own avatar, not a project cover', async ({ page }) => {
    await gotoCreator(page)
    // Decorative images (alt="") carry no accessible role, so getByRole
    // can't reach them — a plain CSS locator is correct here.
    const avatar = page.locator('img[alt=""]').first()
    const src = await avatar.getAttribute('src')
    expect(src).toContain('/avatars/dean')
    expect(await avatar.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  })

  // The profile background is a drawn grid now, not a blurred project cover —
  // same assertion layout.spec.ts makes for the project hub.
  test('has no blurred cover wash behind the profile', async ({ page }) => {
    await gotoCreator(page)
    const blurred = await page.evaluate(
      () => [...document.querySelectorAll('*')].filter((el) => getComputedStyle(el).filter.includes('blur')).length,
    )
    expect(blurred).toBe(0)
  })
})
