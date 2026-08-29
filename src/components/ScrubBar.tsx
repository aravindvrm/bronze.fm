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
        <div className={`w-full overflow-hidden rounded-full bg-parchment/15 ${compact ? 'h-[2px]' : 'h-[3px]'}`}>
          <div
            className="h-full rounded-full bg-gilt"
            style={{ width: `${pct}%`, transition: 'width 90ms linear' }}
          />
        </div>
        {!compact && (
          <div
            className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-parchment opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
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
