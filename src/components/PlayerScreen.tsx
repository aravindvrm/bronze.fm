import { AnimatePresence, motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { useMediaGestures } from '@/audio/useMediaGestures'
import { artUrl } from '@/lib/art'
import { ScrubBar } from '@/components/ScrubBar'
import { Transport } from '@/components/Transport'
import { QueuePanel } from '@/components/QueuePanel'
import { ChevronDown, QueueIcon, VolumeIcon } from '@/components/Icons'

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
  const queueOpen = usePlayer((s) => s.queueOpen)
  const setQueueOpen = usePlayer((s) => s.setQueueOpen)
  const volume = usePlayer((s) => s.volume)
  const volumeSupported = usePlayer((s) => s.volumeSupported)
  const setVolume = usePlayer((s) => s.setVolume)

  const gestures = useMediaGestures()

  if (!item) return null

  const art = artUrl(item.hash, 'item', 1200)
  const feats = item.credits.filter((c) => c.role === 'featured')
  const primary = item.credits[0]?.name ?? content?.credits[0]?.name ?? content?.ownerSlug

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      className="fixed inset-0 z-50 overflow-hidden bg-void"
    >
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
          <div className="font-content text-[10px] uppercase tracking-[0.22em] text-parchment/40">{content?.title}</div>
          <button onClick={() => setQueueOpen(true)} aria-label="Show track list" className="text-parchment/70 transition hover:text-parchment">
            <QueueIcon />
          </button>
        </header>

        {/* Gesture surface: horizontal changes track, vertical is volume where
            supported and navigation where it is not. */}
        <div className="flex flex-1 items-center justify-center py-6" {...gestures}>
          <motion.img
            src={art}
            alt={`${item.title} artwork`}
            className="pointer-events-none aspect-square w-full max-w-[min(78vw,26rem)] select-none rounded-2xl object-cover shadow-2xl shadow-black/70"
            draggable={false}
          />
        </div>

        <div className="pb-2">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate font-content text-[1.75rem] leading-tight text-parchment">{item.title}</h1>
              <p className="mt-1 truncate text-sm text-parchment/50">
                {primary}
                {feats.length > 0 && (
                  <span className="text-parchment/35"> · feat. {feats.map((f) => f.name).join(', ')}</span>
                )}
              </p>
            </div>
            <span className="shrink-0 pb-1 text-[11px] tabular-nums text-parchment/35">
              {index + 1} / {queue.length}
            </span>
          </div>

          <ScrubBar />

          <div className="mt-6">
            <Transport size="lg" />
          </div>

          {/* Only rendered where the platform honours volume assignment. On
              iOS it is read-only, so a slider here would be dead UI. */}
          {volumeSupported && (
            <div className="mt-6 flex items-center gap-3">
              <VolumeIcon className="size-4 shrink-0 text-parchment/40" muted={volume === 0} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-gilt"
              />
            </div>
          )}

          {error && <p className="mt-4 text-center text-xs text-bronze">{error}</p>}
        </div>
      </div>

      <AnimatePresence>{queueOpen && <QueuePanel key="queue" />}</AnimatePresence>
    </motion.div>
  )
}
