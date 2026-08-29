import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { content as adapter } from '@/content/adapter'
import type { StubItem, StubKind } from '@/content/types'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { ScreenHeader } from '@/components/ScreenHeader'

/**
 * Merch and Events — Creator-level sections (PLAN.md §8.2).
 *
 * Both are stubs: the rows exist so the routes and layout are real, but
 * nothing is purchasable or ticketed yet, and every card says so.
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
  const [items, setItems] = useState<StubItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void adapter.getStubs(kind, { creatorSlug: creator.slug }).then((r) => {
      if (!cancelled) setItems(r)
    })
    return () => {
      cancelled = true
    }
  }, [kind, creator.slug])

  const wide = kind === 'video' || kind === 'event'
  const backTo = creatorPath(creator.slug)

  return (
    <div className="min-h-full">
      <ScreenHeader title={title} to={backTo} />

      <div className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        <p className="mb-6 text-xs leading-relaxed text-parchment/40">{blurb}</p>

        {items?.length === 0 && (
          <div className="rounded-md border border-parchment/[0.14] p-5">
            <p className="text-sm text-parchment/60">{creator.name} has nothing here yet.</p>
          </div>
        )}

        <div className={`grid gap-3.5 sm:gap-5 ${wide ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {(items ?? []).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-md border border-parchment/[0.14]"
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
