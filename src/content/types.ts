/**
 * The shape screens consume. Deliberately independent of where content came
 * from — fixtures today, Supabase in Phase 3 — so no screen changes when the
 * backend lands.
 */

export interface Track {
  id: string
  trackNo: number
  title: string
  /** Skits/interludes render differently and are skipped by "skip interludes". */
  isInterlude: boolean
  /** Content hash — the cache key. New master ⇒ new hash ⇒ new URL. */
  hash: string
  bytes: number
  durationMs: number
  channels: number
  sampleRate: number
  bitrate: number
  url: string
}

export interface Release {
  id: string
  artistSlug: string
  slug: string
  title: string
  artistName: string
  /** Mirrors releases.published in Postgres; gates public read via RLS. */
  published: boolean
  totalDurationMs: number
  tracks: Track[]
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
  getRelease(): Promise<Release>
  getStubs(kind: StubKind): Promise<StubItem[]>
}
