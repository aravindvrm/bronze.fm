import { expect, test } from '@playwright/test'
import { gotoCreator, snapshot } from './helpers'

test.describe('pinned content', () => {
  test('lists the creator’s curation in order', async ({ page }) => {
    await gotoCreator(page)
    const pinned = page.locator('section').filter({ hasText: 'PINNED' }).first()
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
  test('covers the root on a cold open, then clears', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.z-\\[60\\]')).toBeVisible()
    await expect(page.locator('.z-\\[60\\]')).toBeHidden({ timeout: 5000 })
    await expect(page.getByRole('searchbox')).toBeVisible()
  })

  test('does not reappear within the same session', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.z-\\[60\\]')).toBeHidden({ timeout: 5000 })
    await page.reload()
    await expect(page.locator('.z-\\[60\\]')).toHaveCount(0)
  })

  // A deep link is someone arriving at a specific thing, usually from a shared
  // URL; holding that behind a timer would be delay with no purpose.
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
