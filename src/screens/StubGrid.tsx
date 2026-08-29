import type { StubKind } from '@/content/types'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StubTiles } from '@/components/StubTiles'

/**
 * Store and Events as their own route — `/@dean/store`, `/@dean/events`.
 *
 * Both are stubs: the rows exist so the routes and layout are real, but
 * nothing is purchasable or ticketed yet, and every card says so.
 *
 * The profile shows these same sections as tabs, so the grid itself lives in
 * StubTiles and is shared. What this screen adds is the standalone framing —
 * a header with a way back, and the blurb — for someone arriving on the URL
 * directly rather than through the profile.
 */
export function StubGrid({
  kind,
  title,
  blurb,
}: {
  kind: StubKind
  title: string
  blurb: string
}) {
  const creator = useCreator()

  return (
    <div className="min-h-full">
      <ScreenHeader title={title} to={creatorPath(creator.slug)} />

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        <p className="mb-6 text-xs leading-relaxed text-parchment/40">{blurb}</p>
        <StubTiles kind={kind} emptyLabel={`${creator.name} has nothing here yet.`} />
      </div>
    </div>
  )
}
