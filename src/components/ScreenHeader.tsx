import { useNavigate } from 'react-router-dom'
import { useScrolledPast } from '@/lib/useScrolledPast'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { BackIcon } from '@/components/Icons'

/**
 * Back goes to an explicit destination rather than through history, so it is
 * predictable regardless of how the screen was reached. Sections inside a
 * Content pass that Content's home; the default is the Creator root.
 *
 * `titleOf` says whose title this is. A Content's own title carries the
 * Content's typeface wherever it appears; a section name is app chrome and
 * stays on the app's.
 *
 * `transparent` drops the bar's own background for screens that supply their
 * own backdrop — the Content hero runs full-bleed behind the header.
 *
 * Otherwise the bar takes its ground only once content is behind it, the same
 * rule AppHeader follows: a permanent fill plus a backdrop blur flattens the
 * ambient field into plain colour, so the background appeared to stop at
 * every header in the app.
 */
export function ScreenHeader({
  title,
  titleOf = 'app',
  transparent = false,
  to,
  width = 'wide',
}: {
  title: string
  titleOf?: 'app' | 'content'
  transparent?: boolean
  to?: string
  /** Match the screen's own content width so the title lines up with it. */
  width?: 'wide' | 'narrow'
}) {
  const navigate = useNavigate()
  const creator = useCreator()
  const scrolled = useScrolledPast()
  const grounded = !transparent && scrolled
  return (
    <header
      // The bar spans the viewport so its blur and background still reach the
      // edges on a wide screen; only its contents align to the content column.
      className={`sticky top-0 z-20 transition-colors duration-200 ${
        grounded ? 'bg-void/80 backdrop-blur-xl' : ''
      }`}
      style={{ paddingTop: 'calc(var(--safe-t) + 0.9rem)' }}
    >
      <div
        className={`mx-auto flex items-center gap-3 px-5 pb-3 sm:px-6 ${
          width === 'narrow' ? 'max-w-3xl' : 'max-w-[var(--app-w)] sm:px-8'
        }`}
      >
        <button
          onClick={() => navigate(to ?? creatorPath(creator.slug))}
          aria-label="Back"
          className="shrink-0 text-parchment/70 transition hover:text-parchment"
        >
          <BackIcon />
        </button>
        {title && (
          <h1
            className={`truncate text-2xl text-parchment sm:text-3xl ${
              titleOf === 'content' ? '' : 'font-display'
            }`}
          >
            {title}
          </h1>
        )}
      </div>
    </header>
  )
}
