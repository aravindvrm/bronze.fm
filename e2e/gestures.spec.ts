import { expect, test, type Page } from '@playwright/test'
import { act, gotoContent, playTrack, snapshot } from './helpers'

/** Drags across the artwork, which is the gesture surface. */
async function dragOverArt(page: Page, dx: number, dy: number, steps = 12) {
  const art = page.locator('img[alt$="artwork"]')
  const box = await art.boundingBox()
  if (!box) throw new Error('artwork not found')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps)
  }
  await page.mouse.up()
}

async function openPlayer(page: Page, index = 1) {
  await gotoContent(page)
  await playTrack(page, index)
  await act(page, 'setExpanded', true)
  await page.locator('img[alt$="artwork"]').waitFor({ state: 'visible' })
  await page.waitForTimeout(600) // let the entrance settle
}

test.describe('player gestures', () => {
  test('swiping left advances to the next track', async ({ page }) => {
    await openPlayer(page, 1)
    const before = await snapshot(page)

    await dragOverArt(page, -140, 0)
    await page.waitForTimeout(400)

    const after = await snapshot(page)
    expect(after.index).toBe(before.index + 1)
  })

  test('swiping right goes back a track', async ({ page }) => {
    await openPlayer(page, 3)
    // prev() restarts the track when past 3s, so seek to the very start first.
    await act(page, 'seek', 0)
    await page.waitForTimeout(200)
    const before = await snapshot(page)

    await dragOverArt(page, 140, 0)
    await page.waitForTimeout(400)

    expect((await snapshot(page)).index).toBe(before.index - 1)
  })

  test('a short drag does not change track', async ({ page }) => {
    await openPlayer(page, 1)
    const before = await snapshot(page)

    // Below the 60px commit threshold: an accidental nudge must do nothing.
    await dragOverArt(page, -30, 0)
    await page.waitForTimeout(400)

    expect((await snapshot(page)).index).toBe(before.index)
  })

  test('vertical drag adjusts volume where the platform allows it', async ({ page }) => {
    await openPlayer(page, 1)
    const before = await snapshot(page)
    test.skip(!before.volumeSupported, 'volume is read-only on this platform')

    await dragOverArt(page, 0, 80) // downward = quieter
    await page.waitForTimeout(300)

    const after = await snapshot(page)
    expect(after.volume).toBeLessThan(before.volume)
    expect(after.index).toBe(before.index) // axis lock held
  })

  test('a diagonal drag commits to one axis only', async ({ page }) => {
    await openPlayer(page, 1)
    await act(page, 'setVolume', 1)
    const before = await snapshot(page)

    // Mostly horizontal: should change track and leave volume alone.
    await dragOverArt(page, -140, 40)
    await page.waitForTimeout(400)

    const after = await snapshot(page)
    expect(after.index).toBe(before.index + 1)
    expect(after.volume).toBe(before.volume)
  })
})
