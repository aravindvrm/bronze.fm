import type { SearchHit, SearchResults } from '@/content/types'

/**
 * Matching and ranking, shared by both adapters.
 *
 * It lives here rather than in either adapter because the two would
 * otherwise order results differently — Postgres by whatever `ilike` and the
 * planner happen to yield, the fixtures by array order — and a search that
 * ranks one way in development and another in production is a bug nobody can
 * reproduce. The adapters' job is to NARROW; this decides what wins.
 */

/** How many of each kind a screen gets unless it asks for more. */
export const DEFAULT_PER_GROUP = 20

export function normalise(text: string): string {
  return (
    text
      .toLowerCase()
      // Fold accents, so "bjork" finds "Björk". NFD splits a letter from its
      // diacritic; the range then strips the marks and leaves the letter.
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
  )
}

/**
 * How well a field answers a query, or 0 for not at all.
 *
 * Three tiers, because they are genuinely different intents: an exact title
 * is the thing itself, a prefix is someone typing that thing's name, and a
 * substring is a word from the middle. Anything else is noise.
 */
export function score(field: string, query: string): number {
  const haystack = normalise(field)
  const needle = normalise(query)
  if (!needle || !haystack) return 0
  if (haystack === needle) return 100
  if (haystack.startsWith(needle)) return 60
  // A match at a word boundary beats one inside a word: "age" should rank
  // "Bronze Age" above "Management".
  if (new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(haystack)) return 40
  return haystack.includes(needle) ? 20 : 0
}

/** The best score across several fields — a title match beats a bio match. */
export function scoreAny(
  fields: (string | undefined)[],
  query: string,
  weights?: number[],
): number {
  let best = 0
  fields.forEach((field, i) => {
    if (!field) return
    const weighted = score(field, query) * (weights?.[i] ?? 1)
    if (weighted > best) best = weighted
  })
  return best
}

export interface Scored<T> {
  hit: T
  score: number
}

/**
 * Highest score first, then alphabetical.
 *
 * The tie-break matters more than it looks: without it, equal-scoring hits
 * come back in whatever order the source produced them, so the same query
 * can list the same results differently between two runs.
 */
export function rank(scored: Scored<SearchHit>[], limit: number): SearchHit[] {
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title))
    .slice(0, limit)
    .map((s) => s.hit)
}

export const emptyResults = (): SearchResults => ({
  creators: [],
  projects: [],
  contents: [],
})

export function totalHits(results: SearchResults): number {
  return results.creators.length + results.projects.length + results.contents.length
}

/**
 * A query worth running.
 *
 * One character matches most of a library and tells nobody anything, and
 * running it on every keystroke from the first is how a search field feels
 * like it is flailing. Two is where a query starts to mean something.
 */
export function isQueryable(query: string): boolean {
  return normalise(query).length >= 2
}

/**
 * What the search field says before anyone types.
 *
 * Here rather than at the two call sites because there are two of them —
 * the header's bar and the search screen's own — and they are meant to be
 * the same field wearing two hats. Typed out twice they drift, and the
 * drift is invisible: nothing fails, the bar just describes itself
 * differently depending on where you opened it.
 *
 * It doubles as the accessible name. The field has no visible label, so
 * this string is the only thing that says what the box is for, and a
 * screen reader announcing something other than what is written in the box
 * describes a different control than the one on screen.
 */
export const SEARCH_PLACEHOLDER = 'Search creators and content'
