import type { ContentAdapter, StubKind } from '@/content/types'
import { bronze } from '@/content/fixtures/bronze.generated'
import { stubs } from '@/content/fixtures/stubs'

const fixtureAdapter: ContentAdapter = {
  async getRelease() {
    return bronze
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
