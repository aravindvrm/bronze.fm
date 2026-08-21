import type { Content, ContentAdapter, ContentType, StubKind } from '@/content/types'
import { bronze, dean } from '@/content/fixtures/bronze.generated'
import { stubs } from '@/content/fixtures/stubs'
import { supabaseAdapter } from '@/content/supabaseAdapter'

const allContent: Content[] = [bronze]

const fixtureAdapter: ContentAdapter = {
  async getCreator(slug) {
    return slug === dean.slug ? dean : null
  },
  async listContent(creatorSlug, type) {
    return allContent.filter((c) => c.ownerSlug === creatorSlug && c.type === type)
  },
  async getContent(creatorSlug, contentSlug) {
    return (
      allContent.find((c) => c.ownerSlug === creatorSlug && c.slug === contentSlug) ?? null
    )
  },
  async getStubs(kind: StubKind, opts?: { creatorSlug?: string; contentSlug?: string }) {
    const byKind = stubs.filter((s) => s.kind === kind)
    // Narrowing to a release returns only what is tagged to it. No fallback to
    // the Creator-wide list: that would make the same set reachable under
    // every release path.
    if (!opts?.contentSlug) return byKind
    return byKind.filter((s) => s.contentSlug === opts.contentSlug)
  },
}

/**
 * `VITE_CONTENT_SOURCE=supabase` switches to real data; anything else,
 * including unset, stays on the local fixtures. Screens are unaware of which
 * is active.
 *
 * Both adapters are plain statically-imported objects — importing
 * supabaseAdapter does not touch Supabase itself, since its client is
 * constructed lazily on first real call (src/lib/supabaseClient.ts). A
 * fixtures-only build never needs Supabase env vars to exist.
 */
const source = import.meta.env.VITE_CONTENT_SOURCE as string | undefined
export const content: ContentAdapter = source === 'supabase' ? supabaseAdapter : fixtureAdapter
export type { ContentType }
