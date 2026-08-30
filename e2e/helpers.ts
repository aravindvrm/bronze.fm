import type { Page } from '@playwright/test'

/** Shape of the dev-only store handle exposed in playerStore.ts. */
export interface PlayerSnapshot {
  isPlaying: boolean
  position: number
  duration: number
  index: number
  expanded: boolean
  queueOpen: boolean
  volume: number
  volumeSupported: boolean
  error: string | null
  queueLength: number
  itemTitle: string | null
}

export async function snapshot(page: Page): Promise<PlayerSnapshot> {
  return page.evaluate(() => {
    const s = (
      window as never as { __player: { getState: () => Record<string, unknown> } }
    ).__player.getState()
    return {
      isPlaying: s.isPlaying,
      position: s.position,
      duration: s.duration,
      index: s.index,
      expanded: s.expanded,
      queueOpen: s.queueOpen,
      volume: s.volume,
      volumeSupported: s.volumeSupported,
      error: s.error,
      queueLength: (s.queue as unknown[]).length,
      itemTitle: ((s.queue as { title: string }[])[s.index as number] ?? null)?.title ?? null,
    } as PlayerSnapshot
  })
}

export async function act(page: Page, fn: string, ...args: unknown[]) {
  await page.evaluate(
    ([f, a]) => {
      const s = (
        window as never as {
          __player: { getState: () => Record<string, (...x: unknown[]) => void> }
        }
      ).__player.getState()
      s[f as string](...(a as unknown[]))
    },
    [fn, args] as const,
  )
}

/** Waits until the store reports playback actually running. */
export async function waitPlaying(page: Page) {
  await page.waitForFunction(
    () => {
      const s = (
        window as never as { __player: { getState: () => { isPlaying: boolean } } }
      ).__player.getState()
      return s.isPlaying
    },
    undefined,
    { timeout: 10_000 },
  )
}

/** Navigates within the Creator namespace and waits for the store handle. */
export async function gotoCreator(page: Page, path = '') {
  await page.goto(`/@dean${path}`)
  await page.waitForFunction(
    () => !!(window as never as { __player?: unknown }).__player,
    undefined,
    {
      timeout: 10_000,
    },
  )
}

/**
 * The feed at the app root.
 *
 * The splash is tap-gated rather than timed, so a bare `goto('/')` leaves it
 * covering the screen indefinitely — dismiss it before anything below can be
 * interacted with. `.first()` because a splash that hasn't mounted yet on a
 * slow load matches nothing, which is fine: it is a `sessionStorage`-gated
 * once-per-session overlay, so a run that lands here twice sees it at most
 * once anyway.
 */
export async function gotoFeed(page: Page) {
  await page.goto('/')
  const splash = page.locator('.z-\\[60\\]').first()
  if (await splash.isVisible().catch(() => false)) {
    await splash.click()
    await splash.waitFor({ state: 'hidden' })
  }
  await page.waitForFunction(
    () => !!(window as never as { __player?: unknown }).__player,
    undefined,
    {
      timeout: 10_000,
    },
  )
}

/**
 * Opens the header's search field and returns it.
 *
 * Search lives behind an icon in the app header rather than as a permanent
 * input, so every test that types into it has to open it first.
 */
export async function openSearch(page: Page) {
  await page.getByRole('button', { name: /^Search$/ }).click()
  const box = page.getByRole('searchbox', { name: /search/i })
  await box.waitFor({ timeout: 5_000 })
  return box
}

/** A Project hub — the interfaces onto one body of work, at /@dean/bronze. */
export async function gotoProject(page: Page, projectSlug = 'bronze') {
  await gotoCreator(page, `/${projectSlug}`)
  await page.getByRole('button', { name: /^Music/ }).waitFor({ timeout: 10_000 })
}

/**
 * A Project's music interface.
 *
 * Nothing is queued until a Content is played from, so tests needing a queue
 * must play rather than merely navigate.
 */
export async function gotoContent(page: Page, projectSlug = 'bronze') {
  await gotoCreator(page, `/${projectSlug}/music`)
  await page.getByRole('button', { name: /Bronze Age \(Skit\)/ }).waitFor({ timeout: 10_000 })
}

/** Plays a track from the open music page and waits for real playback. */
export async function playTrack(page: Page, index: number) {
  await page.evaluate(
    async ([i, slug]) => {
      const mod = await import('/src/content/adapter.ts')
      const c = await mod.content.getContent('dean', slug as string, 'music')
      const s = (
        window as never as {
          __player: { getState: () => { playFrom: (c: unknown, i: number) => void } }
        }
      ).__player.getState()
      s.playFrom(c, i as number)
    },
    [index, 'bronze'] as const,
  )
  await waitPlaying(page)
}

/**
 * The reader, with the gesture overlay out of the way.
 *
 * A paged reader has no visible controls, so the first open explains the
 * gestures over the page — which means every test that touches the page has
 * to get past it first. Dismissed by pre-setting the same flag the app
 * writes, rather than by tapping: a tap is itself a gesture, and a test that
 * had to perform one to reach the gestures would be testing the overlay in
 * every case.
 */
export async function gotoReader(page: Page, opts: { coach?: boolean } = {}) {
  if (!opts.coach) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('bronze:reader-coached', '1')
      } catch {
        // Private mode: the overlay shows, and the test that cares says so.
      }
    })
  }
  await page.goto('/@dean/atonomos/read')
  await page.getByRole('slider', { name: 'Page' }).waitFor({ timeout: 10_000 })
}

/**
 * A touch drag through the real input pipeline.
 *
 * Synthetic PointerEvents prove a handler is wired and nothing else — they
 * skip hit testing, pointer capture and the platform's own gesture
 * arbitration, which is where a swipe actually goes wrong.
 */
export async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8,
) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps },
      ],
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
