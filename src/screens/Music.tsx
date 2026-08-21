import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { useContentItem } from '@/content/ContentContext'
import { artUrl } from '@/lib/art'
import { formatTime } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { OfflineControl } from '@/components/OfflineControl'
import { useCreator } from '@/content/CreatorContext'
import { contentPath } from '@/lib/tenant'

/** Track list for one Content, at `/{creator}/{content}/music`. */
export function Music() {
  const creator = useCreator()
  const content = useContentItem()
  const playingContentId = usePlayer((s) => s.content?.id ?? null)
  const index = usePlayer((s) => s.index)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playFrom = usePlayer((s) => s.playFrom)

  // Rows light up only when THIS release is the one playing — another album
  // playing must not mark tracks here as current.
  const isCurrent = playingContentId === content.id

  const albumPrimary = content.credits[0]?.name ?? content.ownerSlug

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader
        title={content.title}
        titleOf="content"
        to={contentPath(creator.slug, content.slug, 'home')}
      />

      <div className="px-5 pb-2">
        <OfflineControl content={content} />
      </div>

      <ul className="px-3" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        {content.items.map((item, i) => {
          const active = isCurrent && i === index
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.4), duration: 0.5 }}
            >
              <button
                onClick={() => playFrom(content, i)}
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
                  <span className={`block truncate font-content text-sm ${active ? 'text-gilt' : 'text-parchment'}`}>
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
