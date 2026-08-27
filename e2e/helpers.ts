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
    const s = (window as never as { __player: { getState: () => Record<string, unknown> } }).__player.getState()
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
      const s = (window as never as { __player: { getState: () => Record<string, (...x: unknown[]) => void> } }).__player.getState()
      s[f as string](...(a as unknown[]))
    },
    [fn, args] as const,
  )
}

/** Waits until the store reports playback actually running. */
export async function waitPlaying(page: Page) {
  await page.waitForFunction(() => {
    const s = (window as never as { __player: { getState: () => { isPlaying: boolean } } }).__player.getState()
    return s.isPlaying
  }, undefined, { timeout: 10_000 })
}

/** Navigates within the Creator namespace and waits for the store handle. */
export async function gotoCreator(page: Page, path = '') {
  await page.goto(`/@dean${path}`)
  await page.waitForFunction(() => !!(window as never as { __player?: unknown }).__player, undefined, {
    timeout: 10_000,
  })
}

/** The feed at the app root. */
export async function gotoFeed(page: Page) {
  await page.goto('/')
  await page.waitForFunction(() => !!(window as never as { __player?: unknown }).__player, undefined, {
    timeout: 10_000,
  })
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
  await page.evaluate(async ([i, slug]) => {
    const mod = await import('/src/content/adapter.ts')
    const c = await mod.content.getContent('dean', slug as string, 'music')
    const s = (window as never as { __player: { getState: () => { playFrom: (c: unknown, i: number) => void } } }).__player.getState()
    s.playFrom(c, i as number)
  }, [index, 'bronze'] as const)
  await waitPlaying(page)
}
