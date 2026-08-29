import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInstallPrompt } from '@/lib/installPrompt'

const DISMISSED_KEY = 'bronze:install-dismissed-until'
const SNOOZE_DAYS = 14

function isSnoozed(): boolean {
  const until = Number(localStorage.getItem(DISMISSED_KEY) ?? 0)
  return Date.now() < until
}

function snooze() {
  localStorage.setItem(DISMISSED_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000))
}

/**
 * The install call-to-action itself. Chrome's automatic mini-infobar is gone
 * on current Android Chrome — capturing `beforeinstallprompt` and offering
 * this is the only way an install affordance shows up at all now. iOS gets
 * its own copy pointing at the Share sheet, since there's no programmatic
 * prompt to trigger there.
 */
export function InstallBanner() {
  const state = useInstallPrompt()
  const [dismissed, setDismissed] = useState(isSnoozed)

  useEffect(() => {
    if (state.status === 'installed') snooze()
  }, [state.status])

  if (dismissed || state.status === 'unavailable' || state.status === 'installed') return null

  const dismiss = () => {
    snooze()
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        // Full-width above the dock on phones; a corner toast on desktop,
        // where a viewport-wide bar for a dismissible prompt reads as an
        // error banner rather than an offer. Sits clear of the docked mini
        // player, which is taller on desktop.
        className="pointer-events-auto fixed inset-x-4 bottom-[calc(var(--safe-b)+1rem)] z-40 flex items-center gap-3 border border-parchment/25 bg-ink/90 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:inset-x-auto sm:bottom-[calc(var(--safe-b)+7rem)] sm:right-6 sm:w-80"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm text-parchment">Install bronze.fm</p>
          <p className="mt-0.5 text-xs leading-snug text-parchment/50">
            {state.status === 'ios'
              ? 'Tap Share, then "Add to Home Screen".'
              : 'Add it to your home screen for offline playback.'}
          </p>
        </div>
        {state.status === 'available' && (
          <button
            onClick={() => void state.promptInstall()}
            className="shrink-0 bg-gilt px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] text-void"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 px-1 text-lg leading-none text-parchment/40"
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
