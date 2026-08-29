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

    // Starting a work opens the full player over the screen, so collapse it
    // before navigating — which is what a listener does too.
    expect(before.expanded).toBe(true)
    await page.getByRole('button', { name: 'Close player' }).click()
    await expect(page.getByRole('button', { name: 'Close player' })).toBeHidden()

    // In-app navigation throughout: a page.goto here would reload the
    // document and tear down the audio element, which is the very thing this
    // test exists to prove does not happen.
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/@dean\/bronze$/)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/@dean$/)
    // Store and Events became tabs on the profile rather than links, so the
    // last hop routes into a Project — still a genuine cross-section
    // navigation, which is what this asserts survives.
    await page.getByRole('tab', { name: 'Projects' }).click()
    await page.getByRole('button', { name: /^Atonomos/ }).click()
    await expect(page).toHaveURL(/\/@dean\/atonomos$/)

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

test.describe('entering playback', () => {
  /*
   * Selecting a track opens the full player rather than only docking the mini
   * bar: playback is the foreground activity, and the full screen is where
   * the gestures, the track list and the artwork live — which matters more
   * once a project can carry video or images.
   */
  test('starting a track opens the full player', async ({ page }) => {
    await gotoContent(page)
    await expect(page.getByRole('button', { name: 'Close player' })).toHaveCount(0)

    await page.getByRole('button', { name: /Bronze Age \(Skit\)/ }).click()

    await expect(page.getByRole('button', { name: 'Close player' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show track list' })).toBeVisible()
    expect((await snapshot(page)).expanded).toBe(true)
  })

  test('collapsing leaves the listener where they started, still playing', async ({ page }) => {
    await gotoContent(page)
    await page.getByRole('button', { name: /Bronze Age \(Skit\)/ }).click()
    await page.getByRole('button', { name: 'Close player' }).click()

    // The player is an overlay, not a route: the URL never moved.
    await expect(page).toHaveURL(/\/@dean\/bronze\/music$/)
    await expect(page.getByRole('button', { name: 'Open player' })).toBeVisible()
  })

  /*
   * Advancing must NOT reopen the player. playAt is shared with next/prev and
   * end-of-track auto-advance, so a listener who collapsed the player would
   * have it thrown back in their face on every track change.
   */
  test('advancing a track does not reopen a collapsed player', async ({ page }) => {
    await gotoContent(page)
    await page.getByRole('button', { name: /Bronze Age \(Skit\)/ }).click()
    await page.getByRole('button', { name: 'Close player' }).click()
    await expect(page.getByRole('button', { name: 'Open player' })).toBeVisible()

    await act(page, 'next')
    await page.waitForTimeout(500)

    expect((await snapshot(page)).expanded).toBe(false)
    await expect(page.getByRole('button', { name: 'Close player' })).toHaveCount(0)
  })
})
