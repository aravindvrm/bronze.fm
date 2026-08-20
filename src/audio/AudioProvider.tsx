import { useEffect } from 'react'
import { audioEl, usePlayer } from '@/audio/playerStore'
import { artUrl } from '@/lib/art'
import { useOpportunisticCache } from '@/audio/useOpportunisticCache'

/**
 * Binds the singleton audio element to the store and to the OS media session.
 *
 * All player UI state is derived from element events rather than set when the
 * user clicks. That is what keeps the UI correct when playback is driven from
 * outside the page — lock screen, headphone buttons, a car head unit.
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  useOpportunisticCache()

  const _sync = usePlayer((s) => s._sync)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const toggle = usePlayer((s) => s.toggle)
  const seek = usePlayer((s) => s.seek)

  useEffect(() => {
    const a = audioEl()

    const onPlay = () => _sync({ isPlaying: true, error: null })
    const onPause = () => _sync({ isPlaying: false })
    const onWaiting = () => _sync({ isBuffering: true })
    const onPlaying = () => _sync({ isBuffering: false })
    const onLoaded = () => _sync({ duration: a.duration || 0, isBuffering: false })
    const onTime = () => {
      // While dragging, the handle owns the position; ignore element updates
      // so the thumb doesn't fight the finger.
      if (usePlayer.getState().scrubbing) return
      _sync({ position: a.currentTime })
    }
    const onEnded = () => next()
    const onError = () => _sync({ isPlaying: false, isBuffering: false, error: 'Could not load audio' })

    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('waiting', onWaiting)
    a.addEventListener('playing', onPlaying)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('durationchange', onLoaded)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnded)
    a.addEventListener('error', onError)

    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('waiting', onWaiting)
      a.removeEventListener('playing', onPlaying)
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('durationchange', onLoaded)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('error', onError)
    }
    // Named handlers with a matching cleanup — the send-to player passed fresh
    // closures to removeEventListener, so its dedup never actually removed
    // anything and handlers stacked on every re-entry.
  }, [_sync, next])

  // ── OS media session: lock screen, headphones, car ────────────────────
  const item = usePlayer((s) => s.queue[s.index] ?? null)
  const content = usePlayer((s) => s.content)

  useEffect(() => {
    if (!('mediaSession' in navigator) || !item || !content) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      // Primary attributed Creator; falls back to the owner.
      artist: content.credits[0]?.name ?? content.ownerSlug,
      album: content.title,
      artwork: [512, 256, 192].map((size) => ({
        src: artUrl(`${content.slug}-cover`, 'cover', size),
        sizes: `${size}x${size}`,
        type: 'image/svg+xml',
      })),
    })

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => toggle()],
      ['pause', () => toggle()],
      ['nexttrack', () => next()],
      ['previoustrack', () => prev()],
      ['seekto', (d) => d.seekTime != null && seek(d.seekTime)],
      ['seekforward', () => seek(audioEl().currentTime + 10)],
      ['seekbackward', () => seek(audioEl().currentTime - 10)],
    ]
    for (const [action, fn] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, fn)
      } catch {
        /* action unsupported on this platform */
      }
    }
  }, [item, content, toggle, next, prev, seek])

  const isPlaying = usePlayer((s) => s.isPlaying)
  const position = usePlayer((s) => s.position)
  const duration = usePlayer((s) => s.duration)

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // Keeps the lock-screen scrubber in sync with real playback.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return
    if (!Number.isFinite(duration) || duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(position, duration),
        playbackRate: 1,
      })
    } catch {
      /* ignore transient range errors during track changes */
    }
  }, [position, duration])

  return <>{children}</>
}
