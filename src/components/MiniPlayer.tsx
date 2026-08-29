import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { artUrl } from '@/lib/art'
import { ScrubBar } from '@/components/ScrubBar'
import { Transport } from '@/components/Transport'

/**
 * Docked bar shown on every screen except the splash and the expanded player.
 * Same store, different presentation — tapping it expands to the full player,
 * and playback is entirely unaffected by the transition.
 */
export function MiniPlayer() {
  const item = usePlayer((s) => s.queue[s.index] ?? null)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const isPlaying = usePlayer((s) => s.isPlaying)

  if (!item) return null

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'var(--safe-b)' }}
    >
      {/* A floating card on phones; on desktop it becomes a full-width docked
          bar, the shape a music app has there. */}
      <div className="mx-3 mb-3 overflow-hidden rounded-md border border-parchment/25 bg-ink/80 shadow-2xl shadow-black/60 backdrop-blur-xl sm:mx-0 sm:mb-0 sm:rounded-none sm:border-x-0 sm:border-b-0">
        <div className="mx-auto max-w-[var(--app-w)] px-3 pt-1 sm:px-8">
          <ScrubBar compact />
        </div>

        {/* Phone: track info takes the space, transport sits at the end. Desktop:
            three equal columns so the transport lands in the true centre of the
            bar rather than stranded against the right edge. */}
        <div className="mx-auto flex max-w-[var(--app-w)] items-center gap-3 px-3 pb-3 pt-1 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-5 sm:px-8 sm:pb-4">
          <button
            onClick={() => setExpanded(true)}
            aria-label="Open player"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <motion.img
              layoutId="player-art"
              src={artUrl(item.hash, 'item', 256)}
              alt=""
              className="size-11 shrink-0 rounded object-cover sm:size-14"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-content text-sm font-medium text-parchment">{item.title}</span>
              <span className="block truncate text-xs text-parchment/45">
                {isPlaying ? 'Now playing' : 'Paused'}
              </span>
            </span>
          </button>

          <Transport size="sm" />

          {/* Balances the track-info column so the transport is centred. */}
          <div className="hidden sm:block" />
        </div>
      </div>
    </motion.div>
  )
}
