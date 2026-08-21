import { useEffect, useState } from 'react'

/**
 * Chrome stopped showing its own automatic install banner some releases back
 * — a site now has to capture `beforeinstallprompt` itself and drive the
 * affordance, or nothing ever appears, regardless of visit history. iOS
 * Safari never fires this event at all; "Add to Home Screen" there is only
 * ever the manual Share-sheet route, so it's surfaced as its own state
 * rather than folded into "not installable".
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState =
  | { status: 'unavailable' }
  | { status: 'installed' }
  | { status: 'ios' }
  | { status: 'available'; promptInstall: () => Promise<'accepted' | 'dismissed'> }

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return { status: 'installed' }
  if (deferred) {
    return {
      status: 'available',
      promptInstall: async () => {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') setInstalled(true)
        setDeferred(null)
        return outcome
      },
    }
  }
  if (isIOS()) return { status: 'ios' }
  return { status: 'unavailable' }
}
