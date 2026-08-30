import { expect, test } from '@playwright/test'
import { act, gotoCreator, gotoReader, playTrack, snapshot, touchDrag } from './helpers'

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
    await page.waitForFunction(
      () =>
        (
          window as never as { __player: { getState: () => { isPlaying: boolean } } }
        ).__player.getState().isPlaying,
      undefined,
      { timeout: 10_000 },
    )

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
          [...el.querySelectorAll('span')].every((s) => getComputedStyle(s).opacity === '1'),
        ),
      )
      .toBe(true)
  })

  /*
   * The textured field belongs to the splash and to nowhere else.
   *
   * Both halves are asserted. The canvas is worth pinning because its
   * failure mode is silent — a colour that fails to resolve or a context
   * that fails to open leaves a blank white screen rather than an error.
   * And the app behind it is deliberately plain: the field came off it
   * because texture behind everything you read is a distraction, so a
   * canvas reappearing anywhere is a regression, not a bonus.
   */
  test('is the only place the textured field appears', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('img', { name: 'bronze.fm' })).toBeVisible()
    await expect(page.locator('[data-testid="splash-field"]')).toHaveCount(1)

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
        line.evaluate((el) =>
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
    await gotoReader(page)
    const article = page.locator('article')
    await expect(article.getByRole('heading', { name: 'Introduction' })).toBeVisible()

    // Structure survived the docx conversion: headings at more than one
    // level, real paragraphs, and lists kept as lists rather than flattened.
    expect(await article.locator('h2, h3, h4').count()).toBeGreaterThan(5)
    expect(await article.locator('p').count()).toBeGreaterThan(50)
    expect(await article.locator('ul').count()).toBeGreaterThan(0)
  })

  /*
   * The paged reader, end to end.
   *
   * Every one of these covers a bug that shipped during the build and would
   * have been invisible to a smoke test: page turns that moved the wrong
   * way, an index that skipped half the paper, and a position that survived
   * neither a type change nor a reload.
   */
  test('turns pages, and the rail says where you are', async ({ page }) => {
    await gotoReader(page)
    const rail = page.getByRole('slider', { name: 'Page' })
    await expect(rail).toHaveAttribute('aria-valuenow', '1')
    const pages = Number(await rail.getAttribute('aria-valuemax'))
    expect(pages).toBeGreaterThan(20)

    await page.keyboard.press('ArrowRight')
    await expect(rail).toHaveAttribute('aria-valuenow', '2')
    await page.keyboard.press('ArrowLeft')
    await expect(rail).toHaveAttribute('aria-valuenow', '1')
  })

  test('the contents list carries every heading, with live page numbers', async ({ page }) => {
    await gotoReader(page)
    await page.getByRole('button', { name: 'Contents' }).click()

    const entries = page.locator('nav[aria-label="Contents"] li')
    // Sections AND subsections: filtering to the top level left six entries
    // for a paper with twelve headings.
    await expect(entries).toHaveCount(12)

    await entries.nth(7).getByRole('button').click()
    await expect(page.getByRole('slider', { name: 'Page' })).not.toHaveAttribute(
      'aria-valuenow',
      '1',
    )
  })

  /*
   * Swipe, through the real input pipeline.
   *
   * Dispatched over CDP rather than as synthetic PointerEvents, because a
   * synthetic event proves only that the handler is wired — it skips hit
   * testing, pointer capture and the platform's own gesture arbitration,
   * which is where a swipe actually goes wrong. The handler captures the
   * pointer for exactly that reason: without it, a swipe ending over a child
   * element (which is most of a wall-to-wall page of text) delivers its
   * pointerup somewhere else and the turn never fires.
   */
  test('turns pages on a swipe', async ({ page }) => {
    await gotoReader(page)
    const rail = page.getByRole('slider', { name: 'Page' })
    await expect(rail).toHaveAttribute('aria-valuenow', '1')

    await touchDrag(page, { x: 300, y: 400 }, { x: 80, y: 400 })
    await expect(rail).toHaveAttribute('aria-valuenow', '2')
    await touchDrag(page, { x: 80, y: 400 }, { x: 300, y: 400 })
    await expect(rail).toHaveAttribute('aria-valuenow', '1')
  })

  /*
   * The bar leaves once you are reading and comes back on a tap in the
   * middle. It is clipped, never unmounted, and its box keeps its height —
   * asserted here because collapsing it would grow the text column and
   * repaginate the paper under the reader, which is the failure this design
   * exists to avoid.
   */
  test('the top bar gets out of the way, without moving the page', async ({ page }) => {
    await gotoReader(page)
    const bar = page.locator('header').locator('..')
    const heightOf = async () => (await bar.boundingBox())?.height
    const before = await heightOf()

    await page.keyboard.press('ArrowRight')
    await expect
      .poll(async () => bar.evaluate((el) => getComputedStyle(el).clipPath))
      .toContain('100%')
    expect(await heightOf()).toBe(before)

    // The middle of the page is the only gesture that brings it back — the
    // edges are page turns.
    // The page surface, not the article: the article spans every column, so
    // its box is thousands of pixels wide and a position inside it lands
    // somewhere off screen.
    await page.getByTestId('reader-page').click({ position: { x: 180, y: 300 } })
    await expect
      .poll(async () => bar.evaluate((el) => getComputedStyle(el).clipPath))
      .not.toContain('100%')
    expect(await heightOf()).toBe(before)
  })

  /*
   * Two rails at the foot of the page is one too many.
   *
   * The docked player is mounted at the App ROOT so playback survives
   * navigation, which puts it outside the reader's tree entirely — the
   * reader cannot hide it by rendering anything, so it goes through a shared
   * flag. This asserts both halves of that: the bar stands aside while
   * reading, and — the part that would be a real bug — it comes back when
   * the reader is left, rather than staying hidden across the whole app.
   */
  test('the docked player stands aside while reading, and returns after', async ({ page }) => {
    // Queue from inside the reader, not before navigating to it: the store
    // lives in memory, so a `goto` would empty the queue and unmount the very
    // bar under test.
    await gotoReader(page)
    await playTrack(page, 1)
    // playFrom opens the full player; the docked bar is what shows once it is
    // collapsed, which is the state anyone browsing while listening is in.
    await act(page, 'setExpanded', false)

    const bar = page.getByTestId('mini-player')
    await expect(bar).toBeVisible()

    const clip = async () => bar.evaluate((el) => getComputedStyle(el).clipPath)
    await expect.poll(clip).not.toContain('100%')

    await page.keyboard.press('ArrowRight')
    await expect.poll(clip).toContain('100%')

    // Back out of the reader: the flag has to be lowered on the way, or the
    // player stays hidden on every other screen.
    await page.getByTestId('reader-page').click({ position: { x: 180, y: 300 } })
    await page.getByRole('button', { name: 'Back' }).click()
    await expect.poll(clip).not.toContain('100%')
  })

  /*
   * Text size by gesture, and the margin that is NOT a page turn.
   *
   * The margins carry two gestures: a tap turns a page, a vertical drag
   * resizes. Asserting both from the same band is the point — they have to
   * coexist, and the second assertion is the one that matters, because a
   * vertical drag in the middle of the page must do nothing at all. That is
   * where the words are, and resizing them out from under a sentence someone
   * is reading is the failure worth pinning down.
   */
  test('sets text size from the middle, and leaves the margins to turning', async ({ page }) => {
    await gotoReader(page)
    const flow = page.locator('[data-block="0"]').locator('..')
    const size = async () => flow.evaluate((el) => getComputedStyle(el).fontSize)
    const rail = page.getByRole('slider', { name: 'Page' })

    const start = await size()
    await touchDrag(page, { x: 195, y: 620 }, { x: 195, y: 480 })
    const bigger = await size()
    expect(parseFloat(bigger)).toBeGreaterThan(parseFloat(start))

    await touchDrag(page, { x: 195, y: 480 }, { x: 195, y: 620 })
    expect(await size()).toBe(start)

    /*
     * ONE step per gesture, however far the finger goes. Stepping again every
     * 80px meant an ordinary swipe moved two rungs at once, which is most of
     * what made the control feel like it was lurching.
     */
    const far = { x: 195, y: 700 }
    await touchDrag(page, far, { x: 195, y: 300 }, 16)
    const afterLong = await size()
    await touchDrag(page, { x: 195, y: 620 }, { x: 195, y: 480 })
    expect(parseFloat(await size())).toBeGreaterThan(parseFloat(afterLong))

    // The margins turn pages; a vertical drag there is not a size control.
    const sizeNow = await size()
    const pageNow = await rail.getAttribute('aria-valuenow')
    await touchDrag(page, { x: 24, y: 620 }, { x: 24, y: 460 })
    expect(await size()).toBe(sizeNow)
    expect(await rail.getAttribute('aria-valuenow')).toBe(pageNow)
  })

  /*
   * The gestures explain themselves once, then never again — a persisted
   * flag, not a per-session one, because this is something you learn rather
   * than something you are reminded of.
   */
  test('explains its gestures the first time, and only the first time', async ({ page }) => {
    await gotoReader(page, { coach: true })
    const coach = page.getByRole('note', { name: 'How to use the reader' })
    await expect(coach).toBeVisible()

    await page.getByTestId('reader-page').click({ position: { x: 195, y: 300 } })
    await expect(coach).toBeHidden()

    await page.reload()
    await page.getByRole('slider', { name: 'Page' }).waitFor()
    await expect(coach).toBeHidden()

    /*
     * ...but it can be asked for again. A one-shot explanation that cannot be
     * summoned back is a poor deal when it is the only account of how the
     * screen works: miss the five seconds it is up and there is nothing left
     * to ask. That is exactly what happened in use.
     */
    await page.getByRole('button', { name: 'Contents' }).click()
    await page.getByRole('button', { name: 'Gestures' }).click()
    await expect(coach).toBeVisible()
    await expect(page.locator('nav[aria-label="Contents"]')).toBeHidden()
  })

  /*
   * Position is stored as a BLOCK, never a page number, which is what lets it
   * survive a reflow. Asserted through a type-size change because that is the
   * cheapest reflow to trigger and the one that caught the original bug: the
   * page mapping subtracted the current page's offset twice, so changing the
   * size mid-paper threw the reader back toward the start.
   */
  test('keeps your place across a type-size change', async ({ page }) => {
    await gotoReader(page)
    const rail = page.getByRole('slider', { name: 'Page' })

    await page.getByRole('button', { name: 'Contents' }).click()
    await page.locator('nav[aria-label="Contents"] li').nth(7).getByRole('button').click()
    // The sheet animates out; a drag started while it is still there lands on
    // the sheet rather than on the page margin.
    await expect(page.locator('nav[aria-label="Contents"]')).toBeHidden()
    const before = Number(await rail.getAttribute('aria-valuenow'))
    const pagesBefore = Number(await rail.getAttribute('aria-valuemax'))
    expect(before).toBeGreaterThan(5)

    // Text size is a vertical drag in the middle of the page now, not a
    // button. Up is bigger, the way every brightness gesture works.
    await touchDrag(page, { x: 195, y: 600 }, { x: 195, y: 470 })
    await expect
      .poll(async () => Number(await rail.getAttribute('aria-valuemax')))
      .toBeGreaterThan(pagesBefore)

    // Same place in the paper, renumbered — not the same page number.
    const after = Number(await rail.getAttribute('aria-valuenow'))
    const pagesAfter = Number(await rail.getAttribute('aria-valuemax'))
    const drift = Math.abs(after / pagesAfter - before / pagesBefore)
    expect(drift).toBeLessThan(0.05)
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
      () =>
        [...document.querySelectorAll('*')].filter((el) =>
          getComputedStyle(el).filter.includes('blur'),
        ).length,
    )
    expect(blurred).toBe(0)
  })
})
