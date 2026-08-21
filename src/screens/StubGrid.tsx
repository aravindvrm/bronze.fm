import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import type { StubItem, StubKind } from '@/content/types'
import { useCreator } from '@/content/CreatorContext'
import { useOptionalContentItem } from '@/content/ContentContext'
import { contentPath, creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { ScreenHeader } from '@/components/ScreenHeader'

/**
 * Videos, Merch and Events, at either level.
 *
 * Inside a release the list is narrowed to items tagged to it; on the Creator
 * page it is everything. There is deliberately no fallback from the narrow
 * case to the wide one — serving the Creator's full list under a release path
 * would make the same set reachable under every release. An empty release
 * section says so and offers the Creator-wide page instead.
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
  const release = useOptionalContentItem()
  const [items, setItems] = useState<StubItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void adapter
      .getStubs(kind, { creatorSlug: creator.slug, contentSlug: release?.slug })
      .then((r) => {
        if (!cancelled) setItems(r)
      })
    return () => {
      cancelled = true
    }
  }, [kind, creator.slug, release?.slug])

  const wide = kind === 'video' || kind === 'event'
  const backTo = release
    ? contentPath(creator.slug, release.slug, 'home')
    : creatorPath(creator.slug)

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader title={title} to={backTo} />

      <div className="px-5" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        <p className="mb-6 text-xs leading-relaxed text-parchment/40">{blurb}</p>

        {items?.length === 0 && (
          <div className="rounded-md border border-white/[0.14] p-5">
            <p className="text-sm text-parchment/60">
              {release
                ? `Nothing tied to ${release.title} yet.`
                : `${creator.name} has nothing here yet.`}
            </p>
            {release && (
              <Link
                to={creatorPath(creator.slug, kind === 'merch' ? 'merch' : 'events')}
                className="mt-2 inline-block text-[11px] uppercase tracking-[0.15em] text-gilt/80 underline-offset-4 hover:underline"
              >
                See all {kind === 'merch' ? 'merch' : 'dates'}
              </Link>
            )}
          </div>
        )}

        <div className={`grid gap-3.5 ${wide ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {(items ?? []).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-md border border-white/[0.14]"
            >
              <img
                src={artUrl(item.seed, kind, 800)}
                alt=""
                className={`w-full object-cover ${wide ? 'aspect-[16/9]' : 'aspect-square'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent" />

              {/* Corner badge, not inline — on two-column cards an inline badge
                  ate enough width to truncate "Bronze Tee" to "Bronz…". */}
              <span className="absolute right-3 top-3 rounded-full border border-gilt/25 bg-void/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-gilt/70 backdrop-blur-sm">
                Soon
              </span>

              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="truncate font-display text-lg text-parchment">{item.title}</div>
                {item.subtitle && <div className="truncate text-[11px] text-parchment/50">{item.subtitle}</div>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
