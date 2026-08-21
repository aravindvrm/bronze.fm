import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { artUrl } from '@/lib/art'
import { formatTime } from '@/lib/format'
import { ChevronDown } from '@/components/Icons'

/**
 * The track list, reachable from inside the player.
 *
 * Without this the only route to the list was collapsing the player and
 * navigating back to Music — and if you had opened the player from Home,
 * there was no route at all.
 */
export function QueuePanel() {
  const queue = usePlayer((s) => s.queue)
  const index = usePlayer((s) => s.index)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playAt = usePlayer((s) => s.playAt)
  const content = usePlayer((s) => s.content)
  const setQueueOpen = usePlayer((s) => s.setQueueOpen)

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 340, damping: 38 }}
      className="absolute inset-0 z-10 flex flex-col bg-ink/95 backdrop-blur-2xl"
    >
      <header
        className="flex items-center gap-3 px-5 pb-3"
        style={{ paddingTop: 'calc(var(--safe-t) + 0.9rem)' }}
      >
        <button
          onClick={() => setQueueOpen(false)}
          aria-label="Close track list"
          className="text-parchment/70 transition hover:text-parchment"
        >
          <ChevronDown />
        </button>
        <div className="min-w-0">
          <h2 className="truncate font-content text-xl text-parchment">{content?.title}</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-parchment/35">
            {queue.length} tracks
          </p>
        </div>
      </header>

      <ul
        className="flex-1 overflow-y-auto no-scrollbar px-3"
        style={{ paddingBottom: 'calc(var(--safe-b) + 1.5rem)' }}
      >
        {queue.map((item, i) => {
          const active = i === index
          const feats = item.credits.filter((c) => c.role === 'featured')
          return (
            <li key={item.id}>
              <button
                onClick={() => playAt(i)}
                className={`flex w-full items-center gap-3 rounded px-2 py-2.5 text-left transition ${
                  active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span className="relative shrink-0">
                  <img src={artUrl(item.hash, 'item', 128)} alt="" className="size-11 rounded object-cover" />
                  {active && isPlaying && (
                    <span className="absolute inset-0 grid place-items-center rounded bg-void/55">
                      <span className="flex items-end gap-[2px]">
                        {[0, 1, 2].map((b) => (
                          <motion.span
                            key={b}
                            className="w-[2px] bg-gilt"
                            animate={{ height: [4, 11, 6, 13, 4] }}
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
                    {item.isInterlude
                      ? 'Interlude'
                      : feats.length
                        ? `feat. ${feats.map((f) => f.name).join(', ')}`
                        : (item.credits[0]?.name ?? '')}
                  </span>
                </span>

                <span className="shrink-0 text-[11px] tabular-nums text-parchment/35">
                  {formatTime(item.durationMs / 1000)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}
