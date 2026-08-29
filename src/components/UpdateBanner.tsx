import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { applyUpdate, dismissUpdate, subscribeUpdate, updateWaiting } from '@/lib/swUpdate'

/**
 * Offers the reload when a new build is waiting.
 *
 * The app registers its worker with `registerType: 'prompt'` on purpose — an
 * update that reloaded the page by itself would cut off whatever is playing —
 * but until now nothing implemented the prompt, so the config asked for an
 * offer that was never made. This is that offer.
 *
 * Styled as the install prompt's sibling, and positioned identically, since
 * the two are the same kind of thing: a dismissible offer, never a warning.
 * They cannot collide — a session showing this one has a worker already
 * registered, which is the opposite of the state the install prompt appears
 * in.
 */
export function UpdateBanner() {
  const waiting = useSyncExternalStore(subscribeUpdate, updateWaiting, () => false)

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          className="pointer-events-auto fixed inset-x-4 bottom-[calc(var(--safe-b)+1rem)] z-40 flex items-center gap-3 border border-parchment/25 bg-ink/90 px-4 py-3 shadow-[0_8px_30px_var(--color-shade)] backdrop-blur-xl sm:inset-x-auto sm:bottom-[calc(var(--safe-b)+7rem)] sm:right-6 sm:w-80"
        >
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm text-parchment">A new version is ready</p>
            <p className="mt-0.5 text-xs leading-snug text-parchment/50">
              Reloading will stop anything playing.
            </p>
          </div>
          <button
            onClick={dismissUpdate}
            className="shrink-0 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-parchment/50 transition hover:text-parchment"
          >
            Later
          </button>
          <button
            onClick={applyUpdate}
            className="shrink-0 bg-gilt px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-void transition hover:opacity-90"
          >
            Reload
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
