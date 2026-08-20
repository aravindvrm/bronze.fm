/**
 * The shape screens consume. Independent of where content came from —
 * fixtures today, Supabase in Phase 3 — so no screen changes when the
 * backend lands.
 *
 * Tenancy: tenant = Creator. Content has exactly one owner Creator, which
 * drives the URL, the storage prefix and the RLS predicate. Additional
 * Creators are attributed via `credits`.
 */

export type ContentType = 'music' | 'video'

export type CreditRole =
  | 'artist'
  | 'featured'
  | 'producer'
  | 'engineer'
  | 'writer'
  | 'director'

export interface Creator {
  id: string
  slug: string
  name: string
  bio?: string
  /** Set only for Creators promoted to their own subdomain. */
  subdomain?: string | null
  customDomain?: string | null
  tier: 'standard' | 'premium'
}

/** A Creator attributed on a Content — the contributors list, not ownership. */
export interface Credit {
  creatorSlug: string
  name: string
  role: CreditRole
}

/** One item inside a Content: a track on an album, or the file of a video. */
export interface ContentItem {
  id: string
  position: number
  title: string
  isInterlude: boolean
  /**
   * Per-item attribution — features and per-track producers. Distinct from
   * Content.credits, which answers "who made this album"; this answers "who
   * is on this track", which a roll-up cannot express.
   */
  credits: Credit[]
  /** Content hash — the cache key. New master ⇒ new hash ⇒ new URL. */
  hash: string
  bytes: number
  durationMs: number
  channels: number
  sampleRate: number
  bitrate: number
  url: string
}

/** One publishable work. Music holds ordered items; video holds one. */
export interface Content {
  id: string
  type: ContentType
  ownerSlug: string
  slug: string
  title: string
  description?: string
  /** Mirrors content.published in Postgres; gates public read via RLS. */
  published: boolean
  totalDurationMs: number
  items: ContentItem[]
  credits: Credit[]
}

export type StubKind = 'video' | 'merch' | 'event'

export interface StubItem {
  id: string
  kind: StubKind
  title: string
  subtitle?: string
  seed: string
}

export interface ContentAdapter {
  getCreator(slug: string): Promise<Creator | null>
  /** All Content of a type owned by a Creator, in display order. */
  listContent(creatorSlug: string, type: ContentType): Promise<Content[]>
  getContent(creatorSlug: string, contentSlug: string): Promise<Content | null>
  getStubs(kind: StubKind): Promise<StubItem[]>
}
