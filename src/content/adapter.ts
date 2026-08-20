import type { Content, ContentAdapter, ContentType, StubKind } from '@/content/types'
import { bronze, dean } from '@/content/fixtures/bronze.generated'
import { stubs } from '@/content/fixtures/stubs'

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
  async getStubs(kind: StubKind) {
    return stubs.filter((s) => s.kind === kind)
  },
}

/**
 * Phase 3 swaps this for a Supabase-backed adapter reading the release
 * manifest. Screens are unaware of which one is active.
 */
export const content: ContentAdapter = fixtureAdapter
export type { ContentType }
