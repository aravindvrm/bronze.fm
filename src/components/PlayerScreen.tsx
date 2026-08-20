import { useRef } from 'react'
import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { artUrl } from '@/lib/art'
import { ScrubBar } from '@/components/ScrubBar'
import { Transport } from '@/components/Transport'
import { ChevronDown } from '@/components/Icons'

/**
 * Full-screen player. Full-bleed artwork behind a scrim, controls docked low —
 * the layout idea carried over from send-to's jukebox, rebuilt on the shared
 * store so it is a view of playback rather than an owner of it.
 */
export function PlayerScreen() {
  const item = usePlayer((s) => s.queue[s.index] ?? null)
  const content = usePlayer((s) => s.content)
  const index = usePlayer((s) => s.index)
  const queue = usePlayer((s) => s.queue)
  const error = usePlayer((s) => s.error)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const startX = useRef(0)

  if (!item) return null

  const art = artUrl(item.hash, 'item', 1200)

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      className="fixed inset-0 z-50 overflow-hidden bg-void"
      // Swipe left/right to change track — the one genuinely good gesture
      // from the send-to player, kept.
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - startX.current
        if (dx < -50) next()
        else if (dx > 50) prev()
      }}
    >
      {/* Ambient backdrop — blown-up, blurred artwork. */}
      <motion.img
        key={item.hash}
        src={art}
        alt=""
        initial={{ opacity: 0, scale: 1.15 }}
        animate={{ opacity: 0.55, scale: 1.25 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-0 size-full object-cover blur-3xl"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/60 to-void" />

      <div
        className="relative flex h-full flex-col px-6"
        style={{ paddingTop: 'calc(var(--safe-t) + 0.75rem)', paddingBottom: 'calc(var(--safe-b) + 1.5rem)' }}
      >
        <header className="flex items-center justify-between">
          <button onClick={() => setExpanded(false)} aria-label="Close player" className="text-parchment/70 transition hover:text-parchment">
            <ChevronDown />
          </button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.22em] text-parchment/40">{content?.title}</div>
          </div>
          <div className="w-6" />
        </header>

        <div className="flex flex-1 items-center justify-center py-6">
          <motion.img
            layoutId="player-art"
            src={art}
            alt={`${item.title} artwork`}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="aspect-square w-full max-w-[min(78vw,26rem)] rounded-2xl object-cover shadow-2xl shadow-black/70"
          />
        </div>

        <div className="pb-2">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate font-display text-[1.75rem] leading-tight text-parchment">{item.title}</h1>
              <p className="mt-1 truncate text-sm text-parchment/50">{content?.credits[0]?.name ?? content?.ownerSlug}</p>
            </div>
            <span className="shrink-0 pb-1 text-[11px] tabular-nums text-parchment/35">
              {index + 1} / {queue.length}
            </span>
          </div>

          <ScrubBar />

          <div className="mt-6">
            <Transport size="lg" />
          </div>

          {error && <p className="mt-4 text-center text-xs text-bronze">{error}</p>}
        </div>
      </div>
    </motion.div>
  )
}
