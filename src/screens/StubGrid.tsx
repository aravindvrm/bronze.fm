import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { content } from '@/content/adapter'
import type { StubItem, StubKind } from '@/content/types'
import { artUrl } from '@/lib/art'
import { ScreenHeader } from '@/components/ScreenHeader'

/**
 * Videos, Merch and Events all render through here for now. Real routes and
 * real layout with honest "coming soon" states, rather than dead tiles — when
 * the content adapter starts returning real rows, the screens already work.
 */
export function StubGrid({ kind, title, blurb }: { kind: StubKind; title: string; blurb: string }) {
  const [items, setItems] = useState<StubItem[]>([])

  useEffect(() => {
    void content.getStubs(kind).then(setItems)
  }, [kind])

  const wide = kind === 'video' || kind === 'event'

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader title={title} />

      <div className="px-5" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        <p className="mb-6 text-xs leading-relaxed text-parchment/40">{blurb}</p>

        <div className={`grid gap-3.5 ${wide ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-2xl border border-white/10"
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
