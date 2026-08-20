import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { artUrl } from '@/lib/art'
import { formatTime } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'

/**
 * Item list for the Creator's primary music Content. Once a Creator has more
 * than one music Content this grows a list-then-detail step; the adapter
 * already returns an array to make that a screen change, not a model change.
 */
export function Music() {
  const content = usePlayer((s) => s.content)
  const index = usePlayer((s) => s.index)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playAt = usePlayer((s) => s.playAt)

  if (!content) return null

  const albumPrimary = content.credits[0]?.name ?? content.ownerSlug

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader title={content.title} />

      <ul className="px-3" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        {content.items.map((item, i) => {
          const active = i === index
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.4), duration: 0.5 }}
            >
              <button
                onClick={() => playAt(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${
                  active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span className="relative shrink-0">
                  <img src={artUrl(item.hash, 'item', 128)} alt="" className="size-12 rounded-lg object-cover" />
                  {active && isPlaying && (
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-void/55">
                      <span className="flex items-end gap-[2px]">
                        {[0, 1, 2].map((b) => (
                          <motion.span
                            key={b}
                            className="w-[2px] bg-gilt"
                            animate={{ height: [4, 12, 6, 14, 4] }}
                            transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.16, ease: 'easeInOut' }}
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${active ? 'text-gilt' : 'text-parchment'}`}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-parchment/40">
                    {(() => {
                      if (item.isInterlude) return 'Interlude'
                      const feats = item.credits.filter((c) => c.role === 'featured')
                      if (feats.length) return `feat. ${feats.map((f) => f.name).join(', ')}`
                      return item.credits[0]?.name ?? albumPrimary
                    })()}
                  </span>
                </span>

                <span className="shrink-0 text-[11px] tabular-nums text-parchment/35">
                  {formatTime(item.durationMs / 1000)}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
