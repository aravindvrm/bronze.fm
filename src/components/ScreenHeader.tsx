import { useNavigate } from 'react-router-dom'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { BackIcon } from '@/components/Icons'

export function ScreenHeader({ title }: { title: string }) {
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
      <h1 className="truncate font-display text-2xl text-parchment">{title}</h1>
    </header>
  )
}
