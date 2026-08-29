import { create } from 'zustand'
import type { Content, ContentItem } from '@/content/types'

/**
 * ONE audio element for the whole app, held at module scope — deliberately
 * outside React so it survives every route change and re-render. Playback
 * continuing while the user browses Store or Videos is a hard requirement,
 * and owning the element in a component would break it on unmount.
 */
let el: HTMLAudioElement | null = null

export function audioEl(): HTMLAudioElement {
  if (!el) {
    el = new Audio()
    el.preload = 'metadata'
    // Same-origin in dev; Supabase Storage in Phase 3. Needed for any future
    // Web Audio analysis (waveform/visualiser) to avoid tainting the graph.
    el.crossOrigin = 'anonymous'
  }
  return el
}

/** Probes whether this platform honours volume assignment. */
function detectVolumeSupport(): boolean {
  try {
    const probe = new Audio()
    probe.volume = 0.5
    return Math.abs(probe.volume - 0.5) < 0.01
  } catch {
    return false
  }
}

export interface PlayerState {
  content: Content | null
  queue: ContentItem[]
  index: number

  /** Mirrors the element's real state — never set optimistically on click. */
  isPlaying: boolean
  isBuffering: boolean
  /** Seconds. */
  position: number
  duration: number

  /** Full-screen player is presented over the current route. */
  expanded: boolean
  /** Queue panel inside the full-screen player. */
  queueOpen: boolean

  volume: number
  /**
   * iOS Safari makes HTMLMediaElement.volume read-only — Apple mandates
   * hardware volume control — so assignments are silently ignored there.
   * Detected at runtime rather than sniffed from the user agent.
   */
  volumeSupported: boolean
  /** True while the user drags the scrub handle; suppresses timeupdate writes. */
  scrubbing: boolean

  error: string | null
}

interface PlayerActions {
  /**
   * Starts playback from a Content. Viewing a Content must not disturb what is
   * already playing, so the queue only swaps when a different Content is
   * played from — browsing to another album while one plays leaves the current
   * queue intact until you actually press play.
   */
  playFrom: (content: Content, index: number) => void
  playAt: (index: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setScrubbing: (v: boolean) => void
  setExpanded: (v: boolean) => void
  setQueueOpen: (v: boolean) => void
  setVolume: (v: number) => void
  /** Internal — called only by the event bindings. */
  _sync: (patch: Partial<PlayerState>) => void
}

export const usePlayer = create<PlayerState & PlayerActions>((set, get) => ({
  content: null,
  queue: [],
  index: 0,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  expanded: false,
  queueOpen: false,
  volume: 1,
  volumeSupported: detectVolumeSupport(),
  scrubbing: false,
  error: null,

  /*
   * Starting a work opens the full player.
   *
   * Deliberately here and not in playAt: playAt is shared with next/prev and
   * with auto-advance at the end of a track, so putting it there would drag
   * the player back open every time a track changed — including after the
   * listener had collapsed it on purpose. playFrom is only ever a deliberate
   * "play this, from here".
   *
   * The full player is an overlay, not a route, so this does not touch the
   * URL: whatever screen the listener started from is still behind it when
   * they collapse.
   */
  playFrom: (content, index) => {
    if (get().content?.id !== content.id) {
      set({ content, queue: content.items, index })
    }
    set({ expanded: true })
    get().playAt(index)
  },

  playAt: (index) => {
    const { queue } = get()
    const item = queue[index]
    if (!item) return
    const a = audioEl()

    // Only reset the source when the track actually changes — reassigning
    // src to the same URL restarts the download and audibly stutters.
    const nextSrc = new URL(item.url, window.location.origin).href
    if (a.src !== nextSrc) {
      a.src = nextSrc
      set({ position: 0, duration: 0 })
    }
    set({ index, error: null })

    void a.play().catch((err: DOMException) => {
      // Autoplay policy blocks playback until a user gesture. Surface it
      // rather than failing silently the way the send-to player did.
      if (err.name === 'NotAllowedError') {
        set({ isPlaying: false, error: 'Tap play to start audio' })
      } else {
        set({ isPlaying: false, error: err.message })
      }
    })
  },

  toggle: () => {
    const a = audioEl()
    const { queue, index, playAt } = get()
    if (!a.src && queue.length) return playAt(index)
    if (a.paused) {
      void a.play().catch((err: DOMException) => set({ error: err.message }))
    } else {
      a.pause()
    }
  },

  next: () => {
    const { index, queue, playAt } = get()
    if (!queue.length) return
    playAt((index + 1) % queue.length)
  },

  prev: () => {
    const { index, queue, playAt } = get()
    if (!queue.length) return
    // Standard behaviour: restart the track unless already near its start.
    if (audioEl().currentTime > 3) {
      audioEl().currentTime = 0
      return
    }
    playAt((index - 1 + queue.length) % queue.length)
  },

  seek: (seconds) => {
    const a = audioEl()
    if (!Number.isFinite(a.duration)) return
    a.currentTime = Math.min(Math.max(0, seconds), a.duration)
    set({ position: a.currentTime })
  },

  setScrubbing: (v) => set({ scrubbing: v }),
  setExpanded: (v) => set({ expanded: v, queueOpen: v ? get().queueOpen : false }),
  setQueueOpen: (v) => set({ queueOpen: v }),

  setVolume: (v) => {
    const clamped = Math.min(Math.max(0, v), 1)
    const a = audioEl()
    a.volume = clamped
    // Read back: on platforms that ignore the assignment this stays 1, and
    // storing the requested value would desync the UI from what you hear.
    set({ volume: a.volume })
  },
  _sync: (patch) => set(patch),
}))

// Dev-only handle for debugging from the console.
if (import.meta.env.DEV) {
  ;(window as unknown as { __player: typeof usePlayer }).__player = usePlayer
}

export const currentItem = (s: PlayerState): ContentItem | null => s.queue[s.index] ?? null
