import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { content as adapter } from '@/content/adapter'
import type { StubItem, StubKind } from '@/content/types'
import { artUrl } from '@/lib/art'

/**
 * The Store / Events card grid.
 *
 * Shared rather than duplicated: these tiles render both as a tab on the
 * creator profile and as the whole of the standalone `/@dean/store` route,
 * and the two must not drift — a card that says SOON in one place and not
 * the other is worse than either.
 *
 * Fetching lives here too, so a caller only names the kind. On the profile
 * that means the request is made when the tab is first opened rather than on
 * page load, which is the point of putting it behind a tab.
 */
export function StubTiles({ kind, emptyLabel }: { kind: StubKind; emptyLabel: string }) {
  const [items, setItems] = useState<StubItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void adapter.getStubs(kind).then((r) => {
      if (!cancelled) setItems(r)
    })
    return () => {
      cancelled = true
    }
  }, [kind])

  // Events and video read as landscape; merchandise is square.
  const wide = kind === 'video' || kind === 'event'

  if (items?.length === 0) {
    return <p className="text-sm text-parchment/40">{emptyLabel}</p>
  }

  return (
    <div
      className={`grid gap-3.5 sm:gap-5 ${
        wide ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      {(items ?? []).map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden border border-parchment/25"
        >
          <img
            src={artUrl(item.seed, kind, 800)}
            alt=""
            className={`w-full object-cover ${wide ? 'aspect-[16/9]' : 'aspect-square'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 from-0% via-black/45 via-32% to-transparent to-60%" />

          {/* Corner badge, not inline — on two-column cards an inline badge
              ate enough width to truncate "Bronze Tee" to "Bronz…". */}
          <span className="absolute right-3 top-3 border border-gilt/25 bg-black/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gilt/70 backdrop-blur-sm">
            Soon
          </span>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="truncate font-display text-lg text-white">{item.title}</div>
            {item.subtitle && (
              <div className="truncate font-mono text-[11px] text-white/70">{item.subtitle}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
