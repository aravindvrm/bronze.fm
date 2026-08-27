/**
 * The shape screens consume. Independent of where content came from —
 * fixtures or Supabase — so no screen changes when the backend swaps.
 *
 * Tenancy: tenant = Creator. A Project has exactly one owner Creator, which
 * drives the URL, the storage prefix and the RLS predicate. Additional
 * Creators are attributed via `credits`.
 *
 * The layering is Creator → Project → Content → ContentItem. A Project is a
 * body of work (an album, a whitepaper); each Content under it is one *typed
 * interface* onto that work, which is what the last URL segment selects. That
 * split exists because a Project can carry several — Atonomos is a document
 * today and may gain audio later — whereas a Content is always exactly one
 * type. See PLAN.md §8.3.
 */

export type ContentType = 'music' | 'video' | 'ereader'

/** URL segment that selects a Content within its Project. */
export const CONTENT_TYPE_SEGMENT: Record<ContentType, string> = {
  music: 'music',
  video: 'video',
  // `read` rather than `e-reader`: a verb beats a hyphenated compound noun in
  // a path segment.
  ereader: 'read',
}

export function contentTypeFromSegment(segment: string): ContentType | null {
  const found = Object.entries(CONTENT_TYPE_SEGMENT).find(([, seg]) => seg === segment)
  return found ? (found[0] as ContentType) : null
}

export type CreditRole =
  | 'artist'
  | 'featured'
  | 'producer'
  | 'engineer'
  | 'writer'
  | 'director'

/**
 * Platforms the profile can link to. The list is closed because each entry
 * needs a bundled icon — an unknown platform would have nothing to render.
 */
export type SocialPlatform = 'linkedin' | 'x' | 'instagram' | 'spotify'

export interface Creator {
  id: string
  slug: string
  name: string
  bio?: string
  /**
   * Platform → profile URL. A missing entry is meaningful: the profile shows
   * a dimmed stub for it rather than hiding the platform, so the row reads as
   * "not connected yet" rather than as an oversight.
   */
  socials?: Partial<Record<SocialPlatform, string>>
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

/**
 * A block of a document, in reading order.
 *
 * Deliberately a small closed set rather than stored HTML: the source is a
 * Word export, and mapping it to semantic blocks lets the reader inherit the
 * app's own typography instead of carrying Word's. It also means nothing
 * arrives as markup that would have to be sanitised before rendering.
 */
export type DocBlock =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }

/**
 * One typed interface onto a Project. Music holds ordered items; video holds
 * one; an ereader holds its document sections.
 *
 * A Content is identified within its Project by `type`, not by a slug — the
 * URL is `/@dean/bronze/music`, so two Contents of the same type in one
 * Project would be unaddressable.
 */
export interface Content {
  id: string
  type: ContentType
  ownerSlug: string
  projectSlug: string
  title: string
  description?: string
  /** Mirrors content.published in Postgres; gates public read via RLS. */
  published: boolean
  totalDurationMs: number
  items: ContentItem[]
  credits: Credit[]
  /** Set on `ereader` content: the document itself, in reading order. */
  document?: DocBlock[]
}

/**
 * A body of work, and the unit a visitor navigates to: `/@dean/bronze`.
 *
 * Holds the artwork and the description because those describe the work
 * itself rather than any one way of consuming it.
 */
export interface Project {
  id: string
  ownerSlug: string
  slug: string
  title: string
  description?: string
  published: boolean
  /** Typed interfaces onto this work, in display order. */
  contents: Content[]
}

/**
 * A Creator's curated highlight, shown on their profile.
 *
 * Heterogeneous on purpose: a pin is either a single track or a whole work,
 * which is why `itemId` is optional rather than there being two pin types.
 * Everything needed to render and open the pin is resolved by the adapter, so
 * the profile never has to fetch the thing a pin points at.
 */
export interface Pin {
  id: string
  title: string
  subtitle?: string
  projectSlug: string
  contentType: ContentType
  /** Set when the pin is one track — tapping plays it rather than navigating. */
  itemId?: string
  /** Position of that track within its Content, for handing to the player. */
  itemIndex?: number
  /** Content-hash of the track, for its artwork. Absent for whole works. */
  hash?: string
}

export type StubKind = 'video' | 'merch' | 'event'

export interface StubItem {
  id: string
  kind: StubKind
  title: string
  subtitle?: string
  seed: string
  /**
   * Optional project association. Merch and Events are Creator-owned, but in
   * music they usually carry a project dimension too — the Bronze vinyl, the
   * Bronze tour. Absent means Creator-wide.
   */
  projectSlug?: string
}

export interface ContentAdapter {
  getCreator(slug: string): Promise<Creator | null>
  /** Every Project a Creator owns, in display order. */
  listProjects(creatorSlug: string): Promise<Project[]>
  getProject(creatorSlug: string, projectSlug: string): Promise<Project | null>
  /** One typed interface within a Project, or null if it has none of that type. */
  getContent(creatorSlug: string, projectSlug: string, type: ContentType): Promise<Content | null>
  /**
   * Stub rows for a Creator. Merch and Events are Creator-level in this
   * structure (PLAN.md §8.2), so this is not narrowed by project today —
   * `projectSlug` stays on StubItem because the association is real data and
   * a project-scoped view may return.
   */
  getStubs(kind: StubKind, opts?: { creatorSlug?: string }): Promise<StubItem[]>
  /** The Creator's pinned highlights, in curation order. */
  listPins(creatorSlug: string): Promise<Pin[]>
}
