import { describe, expect, it } from 'vitest'
import { content as adapter } from '@/content/adapter'
import { isQueryable, normalise, rank, score, totalHits } from '@/content/search'
import type { SearchHit } from '@/content/types'

/**
 * Ranking lives in one module so both adapters order results identically.
 * Postgres and an in-memory array agree about nothing by default, and a
 * search that ranks one way in development and another in production is a
 * bug that cannot be reproduced where it is seen.
 */
describe('scoring', () => {
  it('prefers exact, then prefix, then word-start, then anywhere', () => {
    expect(score('Bronze', 'bronze')).toBeGreaterThan(score('Bronze Age', 'bronze'))
    expect(score('Bronze Age', 'age')).toBeGreaterThan(score('Management', 'age'))
    expect(score('Management', 'age')).toBeGreaterThan(0)
    expect(score('Bronze', 'zzz')).toBe(0)
  })

  it('ignores case and accents', () => {
    expect(normalise('Björk')).toBe('bjork')
    expect(score('Björk', 'bjork')).toBe(100)
    expect(score('CAFÉ', 'cafe')).toBe(100)
  })

  it('treats regex characters in a query as text', () => {
    // A query is typed by a person, not authored as a pattern: `.` should
    // find a full stop, not any character.
    expect(score('abc', 'a.c')).toBe(0)
    expect(score('a.c', 'a.c')).toBe(100)
  })

  /*
   * Without a tie-break, equal scores come back in source order, so the same
   * query can list the same results differently between two runs — the kind
   * of instability that reads as a flickering UI rather than as a bug.
   */
  it('breaks ties by title so an order is stable', () => {
    const hit = (title: string): SearchHit => ({
      kind: 'content',
      id: title,
      title,
      href: '/x',
    })
    const scored = [
      { hit: hit('Zebra'), score: 40 },
      { hit: hit('Apple'), score: 40 },
      { hit: hit('Mango'), score: 40 },
    ]
    expect(rank(scored, 10).map((h) => h.title)).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('drops non-matches and honours the cap', () => {
    const scored = [
      { hit: { kind: 'content', id: 'a', title: 'A', href: '/' } as SearchHit, score: 10 },
      { hit: { kind: 'content', id: 'b', title: 'B', href: '/' } as SearchHit, score: 0 },
    ]
    expect(rank(scored, 10)).toHaveLength(1)
    expect(rank([...scored, ...scored], 1)).toHaveLength(1)
  })

  it('needs two characters before it will run', () => {
    expect(isQueryable('')).toBe(false)
    expect(isQueryable(' d ')).toBe(false)
    expect(isQueryable('de')).toBe(true)
  })
})

/**
 * The adapter's search is the first method that does not take a slug, and
 * that is the whole point: every other call requires already knowing what
 * you are looking for.
 */
describe('adapter.search', () => {
  /*
   * Individual tracks are deliberately NOT indexed.
   *
   * They were, and it made one word look like five answers: "bronze" is a
   * project, a release and three track titles, all pointing at the same
   * place. The cost is real and worth stating — a track title now finds
   * nothing — and tracks are one tap further in, on the release.
   */
  it('does not index individual tracks', async () => {
    const found = await adapter.search('kissy')
    expect(totalHits(found)).toBe(0)
  })

  it('finds the release a track belongs to, by the release name', async () => {
    const found = await adapter.search('bronze')
    expect(found.contents.map((c) => c.title)).toContain('Bronze')
    expect(found.contents[0].href).toMatch(/@deanMaye\/bronze\/music/)
  })

  /*
   * The listing the home page needed and did not have.
   *
   * Every other adapter method takes a slug, so the feed could only fetch a
   * creator it was already told about — a hard-coded name in an environment
   * variable, which rendered the page blank the moment it went stale.
   */
  it('lists who is on the platform without being told who to look for', async () => {
    const all = await adapter.listCreators()
    expect(all.length).toBeGreaterThan(0)
    expect(all.map((c) => c.slug)).toContain('deanMaye')
  })

  it('finds a creator by name and by handle', async () => {
    expect((await adapter.search('dean')).creators).toHaveLength(1)
    expect((await adapter.search('Dean')).creators[0].href).toBe('/@deanMaye')
    // The handle carries a capital; nobody types one.
    expect((await adapter.search('deanmaye')).creators).toHaveLength(1)
  })

  /*
   * A handle may be spelled with capitals but is addressed without them.
   * `getCreator` matches case-insensitively so `/@deanmaye` is not a 404 for
   * the person typing their own name in lower case.
   */
  it('resolves a handle whatever case it is asked for', async () => {
    for (const asked of ['deanMaye', 'deanmaye', 'DEANMAYE']) {
      const creator = await adapter.getCreator(asked)
      expect(creator?.slug, `getCreator(${asked})`).toBe('deanMaye')
    }
    expect(await adapter.getCreator('dean')).toBeNull()
  })

  it('finds a project by its description, not only its title', async () => {
    const found = await adapter.search('agentic')
    expect(totalHits(found)).toBeGreaterThan(0)
  })

  it('puts one word into every group it belongs to', async () => {
    const found = await adapter.search('bronze')
    expect(found.projects.length).toBeGreaterThan(0)
    expect(found.contents.length).toBeGreaterThan(0)
  })

  /*
   * Attribution and a picture on every hit, because a title alone cannot say
   * whose work it is — and "Bronze" is the project AND the release, so the
   * two rows are otherwise identical.
   */
  it('attributes a release to its creator and badges its kind', async () => {
    const [release] = (await adapter.search('bronze')).contents
    // Whose it is in the subtitle, what it is in the badge — the project row
    // beside it carries the same title, the same cover and no badge.
    expect(release.subtitle).toBe('Dean Maye')
    expect(release.badge).toBe('Music')
    expect(release.imageUrl).toBeTruthy()

    const [project] = (await adapter.search('bronze')).projects
    expect(project.badge).toBeUndefined()
  })

  it('gives every hit something to draw', async () => {
    const found = await adapter.search('bronze')
    for (const hit of [...found.projects, ...found.contents]) {
      expect(hit.imageUrl, `${hit.kind} ${hit.title} has no image`).toBeTruthy()
    }
  })

  it('returns nothing for a query too short to mean anything', async () => {
    expect(totalHits(await adapter.search('b'))).toBe(0)
  })

  it('returns nothing rather than throwing for a query that matches nothing', async () => {
    expect(totalHits(await adapter.search('zzzznosuchthing'))).toBe(0)
  })

  it('caps each group when asked', async () => {
    const found = await adapter.search('on', { perGroup: 1 })
    expect(found.contents.length).toBeLessThanOrEqual(1)
    expect(found.projects.length).toBeLessThanOrEqual(1)
  })
})
