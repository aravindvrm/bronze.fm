import { useNavigate } from 'react-router-dom'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { BackIcon } from '@/components/Icons'

/**
 * `titleOf` says whose title this is. A Content's own title carries the
 * Content's typeface wherever it appears; a section name is app chrome and
 * stays on the app's.
 */
export function ScreenHeader({
  title,
  titleOf = 'app',
}: {
  title: string
  titleOf?: 'app' | 'content'
}) {
  const navigate = useNavigate()
  const creator = useCreator()
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 bg-void/80 px-5 pb-3 backdrop-blur-xl"
      style={{ paddingTop: 'calc(var(--safe-t) + 0.9rem)' }}
    >
      <button
        onClick={() => navigate(creatorPath(creator.slug, 'home'))}
        aria-label="Back"
        className="text-parchment/70 transition hover:text-parchment"
      >
        <BackIcon />
      </button>
      <h1
        className={`truncate text-2xl text-parchment ${
          titleOf === 'content' ? 'font-content' : 'font-display'
        }`}
      >
        {title}
      </h1>
    </header>
  )
}
