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

export async function gotoCreator(page: Page, path = '') {
  await page.goto(`/dean${path}`)
  await page.waitForFunction(() => {
    const w = window as never as { __player?: { getState: () => { queue: unknown[] } } }
    return !!w.__player && w.__player.getState().queue.length > 0
  }, undefined, { timeout: 10_000 })
}
