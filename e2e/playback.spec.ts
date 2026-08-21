import { expect, test } from '@playwright/test'
import { act, gotoContent, playTrack, snapshot } from './helpers'

test.describe('playback', () => {
  test('survives navigation between Creator sections', async ({ page }) => {
    // The load-bearing architectural invariant: the audio element lives at
    // module scope, outside React, so routing cannot tear it down.
    await gotoContent(page)
    await playTrack(page, 1)

    const before = await snapshot(page)
    expect(before.isPlaying).toBe(true)

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/dean\/bronze\/home$/)
    await page.getByRole('button', { name: /^Merch/ }).click()
    await expect(page).toHaveURL(/\/dean\/bronze\/merch$/)

    await page.waitForTimeout(1500)
    const after = await snapshot(page)

    expect(after.isPlaying).toBe(true)
    expect(after.error).toBeNull()
    expect(after.position).toBeGreaterThan(before.position)
    expect(after.itemTitle).toBe(before.itemTitle)
  })

  test('reports real duration once metadata loads', async ({ page }) => {
    await gotoContent(page)
    await playTrack(page, 1)
    await page.waitForFunction(() => {
      const s = (window as never as { __player: { getState: () => { duration: number } } }).__player.getState()
      return s.duration > 0
    })
    const s = await snapshot(page)
    // "Bronze" is 243.9s. Guards against the NaN-until-timeupdate bug.
    expect(s.duration).toBeGreaterThan(240)
    expect(s.duration).toBeLessThan(248)
  })

  test('seeks into the middle of a track', async ({ page }) => {
    await gotoContent(page)
    await playTrack(page, 1)
    await page.waitForFunction(() => {
      const s = (window as never as { __player: { getState: () => { duration: number } } }).__player.getState()
      return s.duration > 0
    })

    await act(page, 'seek', 120)
    await page.waitForTimeout(800)
    const s = await snapshot(page)
    expect(s.position).toBeGreaterThan(118)
    expect(s.error).toBeNull()
  })

  test('advances to the next track when one ends', async ({ page }) => {
    await gotoContent(page)
    // Track 0 is a 13s skit; seek near its end rather than waiting it out.
    await playTrack(page, 0)
    await page.waitForFunction(() => {
      const s = (window as never as { __player: { getState: () => { duration: number } } }).__player.getState()
      return s.duration > 0
    })
    await act(page, 'seek', 12)

    await page.waitForFunction(() => {
      const s = (window as never as { __player: { getState: () => { index: number } } }).__player.getState()
      return s.index === 1
    }, undefined, { timeout: 15_000 })

    expect((await snapshot(page)).index).toBe(1)
  })
})
