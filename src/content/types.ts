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

/** What a type is called where a project or the feed summarises by type. */
export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  music: 'Music',
  video: 'Video',
  ereader: 'Whitepaper',
}

export type CreditRole = 'artist' | 'featured' | 'producer' | 'engineer' | 'writer' | 'director'

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
   * The Creator's own photo. Distinct from a Project's cover art — the
   * profile fell back to borrowing the first Project's cover before this
   * existed, which meant Dean's avatar was literally the Bronze artwork.
   */
  avatarUrl?: string
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
 * A run of text carrying its own emphasis.
 *
 * Paragraphs are sequences of these rather than plain strings, because a
 * plain string cannot hold a link. The flags combine — a word can be bold
 * inside a link — so this is deliberately flat rather than a tree: nesting
 * would buy correctness the reader has no way to render differently, at the
 * cost of a recursive type every importer would have to build.
 *
 * `href` is the only field that leaves the document, so it is the only one
 * that needs checking. Importers must reject anything but http, https and
 * mailto — a `javascript:` URL in an imported file is script execution on a
 * click, and the block model exists precisely so nothing arrives as markup.
 */
export interface Span {
  text: string
  strong?: boolean
  em?: boolean
  code?: boolean
  href?: string
}

/** A table cell: its spans, and whether it spans columns. */
export interface Cell {
  spans: Span[]
  span?: number
}

/**
 * A block of a document, in reading order.
 *
 * Deliberately a closed set rather than stored HTML. Mapping a source
 * document to semantic blocks lets the reader inherit the app's own
 * typography instead of carrying Word's or the web's, it reflows at any type
 * size, and — the part that matters most — nothing arrives as markup, so
 * there is no untrusted HTML to sanitise at render time. Widening the set is
 * how the reader gains a format; the render path never grows a `dangerously`
 * anything.
 *
 * `h` keeps a plain string. Headings are what the contents sheet, the
 * chapter rail and the current-section readout are all built from, and every
 * one of those wants text it can measure and truncate, not a span tree.
 */
export type DocBlock =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; spans: Span[] }
  | { kind: 'ul'; items: Span[][] }
  /** `start` carries a list that does not begin at one. */
  | { kind: 'ol'; items: Span[][]; start?: number }
  | { kind: 'quote'; spans: Span[] }
  /** Preformatted, so it keeps its own line breaks and never reflows. */
  | { kind: 'code'; text: string; lang?: string }
  | { kind: 'table'; head?: Cell[]; rows: Cell[][] }
  | { kind: 'figure'; src: string; alt: string; caption?: Span[] }
  | { kind: 'rule' }

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
  /**
   * Words in `document`, when it is known without the document being loaded.
   *
   * The hub shows a read time for a paper it never renders, and counting
   * requires the prose. Carrying the count separately is what lets the
   * document itself be fetched only when the reader is actually opened.
   * Absent on Supabase-backed content, which arrives with its body anyway.
   */
  wordCount?: number
  /**
   * When this interface was published. Drives the feed's ordering and its
   * relative-time label — each typed interface is its own feed entry, not
   * each Project, so a Project that later gains a second interface gets a
   * second entry rather than its existing one silently changing date.
   */
  createdAt?: string
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

export type StubKind = 'video' | 'store' | 'event'

export interface StubItem {
  id: string
  kind: StubKind
  title: string
  subtitle?: string
  seed: string
  /**
   * Optional project association. Store and Events are Creator-owned, but in
   * music they usually carry a project dimension too — the Bronze vinyl, the
   * Bronze tour. Absent means Creator-wide.
   */
  projectSlug?: string
}

/** What a search hit is — the four things a person might name out loud. */
export type SearchKind = 'creator' | 'project' | 'content' | 'track'

/**
 * One result, flattened to what a row needs to draw itself and to navigate.
 *
 * Deliberately not the underlying Creator/Project/Content: a result list
 * shows one shape, and carrying four different records into it would push
 * the "what am I looking at" question into the rendering, where it becomes a
 * switch per column.
 */
export interface SearchHit {
  kind: SearchKind
  id: string
  title: string
  /** Where this sits — "Dean", or "Bronze · Music". */
  subtitle?: string
  /** In-app path this row leads to. */
  href: string
  /** Avatar, cover, or track art. */
  imageUrl?: string
}

/**
 * Results by kind rather than one ranked list.
 *
 * Grouping is what lets "is there a creator by this name" be answerable
 * without reading past ten track matches from a prolific one.
 */
export interface SearchResults {
  creators: SearchHit[]
  projects: SearchHit[]
  contents: SearchHit[]
  tracks: SearchHit[]
}

export interface ContentAdapter {
  getCreator(slug: string): Promise<Creator | null>
  /** Every Project a Creator owns, in display order. */
  listProjects(creatorSlug: string): Promise<Project[]>
  getProject(creatorSlug: string, projectSlug: string): Promise<Project | null>
  /** One typed interface within a Project, or null if it has none of that type. */
  getContent(creatorSlug: string, projectSlug: string, type: ContentType): Promise<Content | null>
  /**
   * Stub rows for a Creator. Store and Events are Creator-level in this
   * structure (PLAN.md §8.2), so this is not narrowed by project today —
   * `projectSlug` stays on StubItem because the association is real data and
   * a project-scoped view may return.
   */
  getStubs(kind: StubKind, opts?: { creatorSlug?: string }): Promise<StubItem[]>
  /** The Creator's pinned highlights, in curation order. */
  listPins(creatorSlug: string): Promise<Pin[]>
  /**
   * Everything matching a query, grouped by kind.
   *
   * The first method here that does not take a slug, and that is the point
   * of it: every other call requires already knowing what you are looking
   * for. Search is how someone finds a creator they cannot name the URL of,
   * which the app could not do at all before this existed.
   *
   * `perGroup` caps each group. The header's quick hits ask for a few; the
   * search screen asks for enough to be worth a page.
   */
  search(query: string, opts?: { perGroup?: number }): Promise<SearchResults>
}
