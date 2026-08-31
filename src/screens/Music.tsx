import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { useProject } from '@/content/ProjectContext'
import { artUrl } from '@/lib/art'
import { formatTime } from '@/lib/format'
import { AppHeader } from '@/components/AppHeader'
import { OfflineControl } from '@/components/OfflineControl'
import { useCreator } from '@/content/CreatorContext'
import { projectPath } from '@/lib/tenant'

/** Track list for a Project's music interface, at `/@deanMaye/bronze/music`. */
export function Music() {
  const creator = useCreator()
  const project = useProject()
  // The route resolved to this screen because the Project holds a music
  // Content, so it is present by construction.
  const content = project.contents.find((c) => c.type === 'music')!
  const playingContentId = usePlayer((s) => s.content?.id ?? null)
  const index = usePlayer((s) => s.index)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playFrom = usePlayer((s) => s.playFrom)

  // Rows light up only when THIS release is the one playing — another album
  // playing must not mark tracks here as current.
  const isCurrent = playingContentId === content.id

  const albumPrimary = content.credits[0]?.name ?? content.ownerSlug

  return (
    <div className="min-h-full">
      <AppHeader backTo={projectPath(creator.slug, project.slug)} />

      <div className="mx-auto max-w-3xl px-5 pb-2 sm:px-6">
        {/* The release's name, in the page rather than the bar: it can wrap
            here instead of truncating at a phone's width. */}
        <h1 className="text-3xl leading-tight text-parchment sm:text-4xl">{content.title}</h1>
        <div className="mt-5">
          <OfflineControl content={content} />
        </div>
      </div>

      {/* Narrower than the grids above: a track row is title on the left and a
          duration on the right, so at full width the two ends drift apart with
          nothing between them. */}
      <ul
        className="mx-auto max-w-3xl px-3 sm:px-6"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
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
                className={`flex w-full items-center gap-3 px-2 py-2.5 text-left transition ${
                  active ? 'bg-parchment/[0.07]' : 'hover:bg-parchment/[0.04]'
                }`}
              >
                <span className="relative shrink-0">
                  <img
                    src={artUrl(item.hash, 'item', 128)}
                    alt=""
                    className="size-12 object-cover"
                  />
                  {active && isPlaying && (
                    <span className="absolute inset-0 grid place-items-center bg-void/55">
                      <span className="flex items-end gap-[2px]">
                        {[0, 1, 2].map((b) => (
                          <motion.span
                            key={b}
                            className="w-[2px] bg-gilt"
                            animate={{ height: [4, 12, 6, 14, 4] }}
                            transition={{
                              duration: 1.1,
                              repeat: Infinity,
                              delay: b * 0.16,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${active ? 'text-ember' : 'text-parchment'}`}
                  >
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
