import { useRef } from 'react'
import { usePlayer } from '@/audio/playerStore'

/**
 * Gesture layer for the full-screen player, modelled on how native players
 * behave rather than inventing a scheme.
 *
 *   horizontal  → previous / next track      (Apple Music, Spotify artwork swipe)
 *   vertical    → volume, where the platform honours it
 *                 otherwise: down collapses, up opens the queue
 *
 * Built on Pointer Events so one code path covers touch, mouse and pen. The
 * axis is locked on first meaningful movement, so a slightly diagonal swipe
 * does not change track *and* move volume.
 *
 * Pinch is deliberately absent: on the web it requires `touch-action: none`
 * over the whole surface, which fights browser zoom and breaks accessibility
 * zoom on iOS. Swipe-down already covers dismissal, which is what pinch-in
 * would have done.
 */

const AXIS_LOCK_PX = 12
const TRACK_COMMIT_PX = 60
const DISMISS_COMMIT_PX = 90
/** Full-scale volume travel, in pixels of vertical drag. */
const VOLUME_TRAVEL_PX = 220

type Axis = null | 'x' | 'y'

export function useMediaGestures() {
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const setExpanded = usePlayer((s) => s.setExpanded)
  const setQueueOpen = usePlayer((s) => s.setQueueOpen)
  const setVolume = usePlayer((s) => s.setVolume)
  const volumeSupported = usePlayer((s) => s.volumeSupported)

  const start = useRef({ x: 0, y: 0, vol: 1 })
  const axis = useRef<Axis>(null)
  const active = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    // Ignore the scrub bar and buttons — they own their own pointers.
    if ((e.target as HTMLElement).closest('button,[role="slider"]')) return
    active.current = true
    axis.current = null
    start.current = { x: e.clientX, y: e.clientY, vol: usePlayer.getState().volume }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    if (axis.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }

    // Volume tracks the finger live; everything else commits on release.
    if (axis.current === 'y' && volumeSupported) {
      setVolume(start.current.vol - dy / VOLUME_TRAVEL_PX)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!active.current) return
    active.current = false
    const el = e.currentTarget as HTMLElement
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)

    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    if (axis.current === 'x') {
      if (dx <= -TRACK_COMMIT_PX) next()
      else if (dx >= TRACK_COMMIT_PX) prev()
      return
    }

    if (axis.current === 'y' && !volumeSupported) {
      // Volume is inert here, so vertical is free for navigation instead of
      // being a gesture that appears to do nothing.
      if (dy >= DISMISS_COMMIT_PX) setExpanded(false)
      else if (dy <= -DISMISS_COMMIT_PX) setQueueOpen(true)
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    // Required for pointermove to keep firing during a touch drag.
    style: { touchAction: 'none' as const },
  }
}
