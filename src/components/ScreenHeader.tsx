import { useNavigate } from 'react-router-dom'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { BackIcon } from '@/components/Icons'

/**
 * Back always returns to the Creator root rather than using history, so the
 * destination is predictable regardless of how the screen was reached.
 *
 * `titleOf` says whose title this is. A Content's own title carries the
 * Content's typeface wherever it appears; a section name is app chrome and
 * stays on the app's.
 *
 * `transparent` drops the bar's own background for screens that supply their
 * own backdrop — the Content hero runs full-bleed behind the header.
 */
export function ScreenHeader({
  title,
  titleOf = 'app',
  transparent = false,
}: {
  title: string
  titleOf?: 'app' | 'content'
  transparent?: boolean
}) {
  const navigate = useNavigate()
  const creator = useCreator()
  return (
    <header
      className={`sticky top-0 z-20 flex items-center gap-3 px-5 pb-3 ${
        transparent ? '' : 'bg-void/80 backdrop-blur-xl'
      }`}
      style={{ paddingTop: 'calc(var(--safe-t) + 0.9rem)' }}
    >
      <button
        onClick={() => navigate(creatorPath(creator.slug))}
        aria-label="Back"
        className="shrink-0 text-parchment/70 transition hover:text-parchment"
      >
        <BackIcon />
      </button>
      {title && (
        <h1
          className={`truncate text-2xl text-parchment ${
            titleOf === 'content' ? 'font-content' : 'font-display'
          }`}
        >
          {title}
        </h1>
      )}
    </header>
  )
}
