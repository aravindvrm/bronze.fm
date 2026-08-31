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
      kind: 'track',
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
      { hit: { kind: 'track', id: 'a', title: 'A', href: '/' } as SearchHit, score: 10 },
      { hit: { kind: 'track', id: 'b', title: 'B', href: '/' } as SearchHit, score: 0 },
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
  it('finds a track three levels below anything a screen loads', async () => {
    const found = await adapter.search('kissy')
    expect(found.tracks.map((t) => t.title)).toContain('Kissy Face Emoji')
    // And it knows where the track lives, so the row can navigate.
    expect(found.tracks[0].href).toMatch(/@dean\/bronze\/music/)
    expect(found.tracks[0].subtitle).toContain('Bronze')
  })

  it('finds a creator by name and by handle', async () => {
    expect((await adapter.search('dean')).creators).toHaveLength(1)
    expect((await adapter.search('Dean')).creators[0].href).toBe('/@dean')
  })

  it('finds a project by its description, not only its title', async () => {
    const found = await adapter.search('agentic')
    expect(totalHits(found)).toBeGreaterThan(0)
  })

  it('puts one word into every group it belongs to', async () => {
    // "Bronze" is a project, a release and a word in track titles. Grouping
    // is what keeps all three answerable at once.
    const found = await adapter.search('bronze')
    expect(found.projects.length).toBeGreaterThan(0)
    expect(found.contents.length).toBeGreaterThan(0)
    expect(found.tracks.length).toBeGreaterThan(0)
  })

  it('returns nothing for a query too short to mean anything', async () => {
    expect(totalHits(await adapter.search('b'))).toBe(0)
  })

  it('returns nothing rather than throwing for a query that matches nothing', async () => {
    expect(totalHits(await adapter.search('zzzznosuchthing'))).toBe(0)
  })

  it('caps each group when asked', async () => {
    const found = await adapter.search('e', { perGroup: 2 })
    expect(found.tracks.length).toBeLessThanOrEqual(2)
  })
})
