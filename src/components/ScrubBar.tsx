import { useCallback, useRef } from 'react'
import { usePlayer } from '@/audio/playerStore'
import { formatTime } from '@/lib/format'

/**
 * Seek bar built on Pointer Events — one code path covers mouse, touch and pen.
 *
 * The send-to original bound `touchmove` only, with no `touchstart` gate: it
 * could not be used with a mouse at all, and any stray touch crossing the bar
 * would seek. Here a drag must begin on the bar (pointer capture), and tapping
 * anywhere on the track seeks to that point.
 */
export function ScrubBar({ compact = false }: { compact?: boolean }) {
  const position = usePlayer((s) => s.position)
  const duration = usePlayer((s) => s.duration)
  const seek = usePlayer((s) => s.seek)
  const setScrubbing = usePlayer((s) => s.setScrubbing)
  const trackRef = useRef<HTMLDivElement>(null)

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || duration <= 0) return
      const ratio = Math.min(Math.max(0, (clientX - rect.left) / rect.width), 1)
      seek(ratio * duration)
    },
    [duration, seek],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    seekFromEvent(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    seekFromEvent(e.clientX)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setScrubbing(false)
  }

  return (
    <div className={compact ? 'w-full' : 'w-full select-none'}>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seek(position + 5)
          if (e.key === 'ArrowLeft') seek(position - 5)
        }}
        className={`group relative cursor-pointer touch-none ${compact ? 'py-1' : 'py-3'}`}
      >
        <div className={`w-full overflow-hidden bg-parchment/20 ${compact ? 'h-[2px]' : 'h-[3px]'}`}>
          <div
            className="h-full bg-gilt"
            style={{ width: `${pct}%`, transition: 'width 90ms linear' }}
          />
        </div>
        {!compact && (
          /*
           * Always visible, never hover-gated.
           *
           * This handle used to be `opacity-0` until `group-hover`, which
           * meant it did not exist on touch at all — there is no hover on a
           * phone, so the bar looked like a progress readout rather than
           * something you could grab, which is exactly what it is.
           *
           * `pointer-events-none` is load-bearing: the track above owns the
           * pointer capture that makes the drag work, and a handle that
           * swallowed the pointerdown would break dragging from the one spot
           * a user is most likely to press.
           */
          <div
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gilt shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-125 group-active:scale-125"
            style={{ left: `${pct}%` }}
          />
        )}
      </div>

      {!compact && (
        <div className="flex justify-between text-[11px] tabular-nums tracking-wide text-parchment/50">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  )
}
