import type { StubKind } from '@/content/types'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { AppHeader } from '@/components/AppHeader'
import { StubTiles } from '@/components/StubTiles'

/**
 * Store and Events as their own route — `/@deanMaye/store`, `/@deanMaye/events`.
 *
 * Both are stubs: the rows exist so the routes and layout are real, but
 * nothing is purchasable or ticketed yet, and every card says so.
 *
 * The profile shows these same sections as tabs, so the grid itself lives in
 * StubTiles and is shared. What this screen adds is the standalone framing —
 * a header with a way back, and the blurb — for someone arriving on the URL
 * directly rather than through the profile.
 */
export function StubGrid({ kind, title, blurb }: { kind: StubKind; title: string; blurb: string }) {
  const creator = useCreator()

  return (
    <div className="min-h-full">
      <AppHeader backTo={creatorPath(creator.slug)} />

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        <h1 className="font-display text-3xl leading-tight text-parchment sm:text-4xl">{title}</h1>
        <p className="mb-6 mt-3 text-xs leading-relaxed text-parchment/40">{blurb}</p>
        <StubTiles kind={kind} />
      </div>
    </div>
  )
}
