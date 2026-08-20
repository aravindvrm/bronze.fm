import { usePlayer } from '@/audio/playerStore'
import { PlayIcon, PauseIcon, NextIcon, PrevIcon } from '@/components/Icons'

export function Transport({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const isPlaying = usePlayer((s) => s.isPlaying)
  const isBuffering = usePlayer((s) => s.isBuffering)
  const toggle = usePlayer((s) => s.toggle)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)

  const lg = size === 'lg'

  return (
    <div className={`flex items-center justify-center ${lg ? 'gap-9' : 'gap-4'}`}>
      {lg && (
        <button onClick={prev} aria-label="Previous track" className="text-parchment/70 transition hover:text-parchment active:scale-90">
          <PrevIcon className="size-7" />
        </button>
      )}

      <button
        onClick={toggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={`relative grid place-items-center rounded-full bg-parchment text-void transition active:scale-95 ${
          lg ? 'size-16' : 'size-10'
        }`}
      >
        {isBuffering ? (
          <span className={`animate-spin rounded-full border-2 border-void/25 border-t-void ${lg ? 'size-6' : 'size-4'}`} />
        ) : isPlaying ? (
          <PauseIcon className={lg ? 'size-7' : 'size-4'} />
        ) : (
          <PlayIcon className={`${lg ? 'size-7 translate-x-[2px]' : 'size-4 translate-x-[1px]'}`} />
        )}
      </button>

      {lg && (
        <button onClick={next} aria-label="Next track" className="text-parchment/70 transition hover:text-parchment active:scale-90">
          <NextIcon className="size-7" />
        </button>
      )}
      {!lg && (
        <button onClick={next} aria-label="Next track" className="text-parchment/70 transition hover:text-parchment active:scale-90">
          <NextIcon className="size-5" />
        </button>
      )}
    </div>
  )
}
