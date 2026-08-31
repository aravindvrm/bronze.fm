import { expect, test, type Page } from '@playwright/test'
import { gotoFeed, openSearch } from './helpers'

/**
 * Search, which before this was a filter over the home page.
 *
 * That distinction is the whole point of these tests. The old behaviour hid
 * rows the feed had already loaded, and the feed loads one creator — so a
 * query for anyone else returned nothing, and would have gone on returning
 * nothing however many creators existed. Nothing about it looked broken.
 */
test.describe('search', () => {
  const results = (page: Page) => page.locator('section h2')

  /*
   * The case that could not work before, and the reason the adapter grew a
   * method that takes no slug: nothing the home page loads reaches beyond
   * one creator.
   */
  test('finds a release the home page never loaded a row for', async ({ page }) => {
    await gotoFeed(page)
    const box = await openSearch(page)
    await box.fill('bronze')

    const quick = page.getByRole('button', { name: /Bronze/ }).first()
    await expect(quick).toBeVisible()
  })

  /*
   * Individual tracks are deliberately out of the index. They were in, and
   * one word came back as five rows pointing at the same place — "bronze" is
   * a project, a release and three track titles. The cost is that a track
   * title finds nothing, which this states rather than leaves to be
   * discovered.
   */
  test('does not offer individual tracks as results', async ({ page }) => {
    await page.goto('/search?q=kissy')
    await expect(page.getByText(/Nothing matches/)).toBeVisible()
  })

  /*
   * A release and its project routinely share a title, so the row's own name
   * says neither whose it is nor what kind of thing it is.
   */
  test('badges a release with its kind, and pictures every row', async ({ page }) => {
    await page.goto('/search?q=bronze')

    // The project and the release come back with the same word and the same
    // cover. The badge is the only thing that separates them, so it is what
    // gets asserted.
    const project = page.locator('section', { hasText: 'Projects' }).getByRole('listitem').first()
    const release = page.locator('section', { hasText: 'Releases' }).getByRole('listitem').first()

    await expect(project).toContainText('Bronze')
    await expect(release).toContainText('Bronze')
    await expect(release).toContainText('Music')
    await expect(project).not.toContainText('Music')

    // Attribution is the creator, on its own, on both.
    await expect(release).toContainText('Dean Maye')
    for (const row of [project, release]) {
      await expect(row.locator('img')).toHaveAttribute('src', /.+/)
    }
  })

  test('hands off from the header to a screen that owns the URL', async ({ page }) => {
    await gotoFeed(page)
    const box = await openSearch(page)
    await box.fill('bronze')
    await page.getByRole('button', { name: /See all results/ }).click()

    await expect(page).toHaveURL(/\/search\?q=bronze/)
    await expect(results(page).first()).toBeVisible()
    // One field on the screen, carrying the query it was handed.
    await expect(page.getByRole('searchbox', { name: 'Search everything' })).toHaveValue('bronze')
  })

  /*
   * A search that is not in the URL cannot be shared, cannot be returned to,
   * and vanishes on reload. This is the half of "properly" that the old
   * implementation had no way to offer.
   */
  test('is addressable — a link opens its own results', async ({ page }) => {
    await page.goto('/search?q=agentic')
    await expect(page.getByRole('searchbox', { name: 'Search everything' })).toHaveValue('agentic')
    await expect(results(page).first()).toBeVisible()
  })

  test('groups by kind and says how many of each', async ({ page }) => {
    await page.goto('/search?q=bronze')
    // Results arrive after a debounce and an await; reading the DOM before
    // they land measures the empty state, not the grouping.
    await expect(results(page).first()).toBeVisible()
    const headings = await results(page).allTextContents()
    // Bronze is a project, a release and a track title, so it lands in more
    // than one group — which is the case a single ranked list would blur.
    expect(headings.length).toBeGreaterThan(1)
    expect(headings).toContain('Projects')

    // Each group states its size, which is the thing a row of chips had
    // nowhere to put and the reason for grouping at all.
    const counts = await page.locator('section h2 + span, section h2 ~ span').allTextContents()
    expect(counts.some((t) => /^\d+$/.test(t.trim()))).toBe(true)
  })

  test('says plainly when there is nothing, rather than showing an empty page', async ({
    page,
  }) => {
    await page.goto('/search?q=zzzznosuchthing')
    await expect(page.getByText(/Nothing matches/)).toBeVisible()
  })

  test('a result leads to the thing it names', async ({ page }) => {
    await page.goto('/search?q=dean')
    await page.getByRole('button', { name: /Dean/ }).first().click()
    await expect(page).toHaveURL(/\/@deanMaye$/)
  })

  /*
   * One character matches most of a library and says nothing about intent.
   * Asserted because the guard is easy to drop and the symptom — a search
   * that runs on every keystroke from the first — is a performance problem
   * rather than a visible one.
   */
  test('waits for a query worth running', async ({ page }) => {
    await page.goto('/search?q=')
    const box = page.getByRole('searchbox', { name: 'Search everything' })
    await box.fill('d')
    await expect(page.getByText(/at least two characters/i)).toBeVisible()
    await box.fill('de')
    await expect(page.getByText(/at least two characters/i)).toHaveCount(0)
  })
})
