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
  const track = usePlayer((s) => s.queue[s.index] ?? null)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const isPlaying = usePlayer((s) => s.isPlaying)

  if (!track) return null

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'var(--safe-b)' }}
    >
      <div className="mx-3 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-ink/80 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="px-3 pt-1">
          <ScrubBar compact />
        </div>

        <div className="flex items-center gap-3 px-3 pb-3 pt-1">
          <button
            onClick={() => setExpanded(true)}
            aria-label="Open player"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <motion.img
              layoutId="player-art"
              src={artUrl(track.hash, 'track', 256)}
              alt=""
              className="size-11 shrink-0 rounded-lg object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-parchment">{track.title}</span>
              <span className="block truncate text-xs text-parchment/45">
                {isPlaying ? 'Now playing' : 'Paused'}
              </span>
            </span>
          </button>

          <Transport size="sm" />
        </div>
      </div>
    </motion.div>
  )
}
