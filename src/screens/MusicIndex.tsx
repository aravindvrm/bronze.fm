import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import type { Content } from '@/content/types'
import { creatorPath } from '@/lib/tenant'
import { coverUrl } from '@/lib/cover'
import { formatTotal } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'

/** The Creator's music Content, each linking to its own path. */
export function MusicIndex() {
  const navigate = useNavigate()
  const creator = useCreator()
  const [releases, setReleases] = useState<Content[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void adapter.listContent(creator.slug, 'music').then((r) => {
      if (!cancelled) setReleases(r)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug])

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader title="Music" />

      <div className="px-5" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        {releases?.length === 0 && (
          <p className="mt-4 text-xs text-parchment/40">No releases yet.</p>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          {(releases ?? []).map((release, i) => (
            <motion.button
              key={release.id}
              onClick={() => navigate(creatorPath(creator.slug, release.slug))}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
              className="text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={coverUrl(release, 600)}
                  alt={`${release.title} cover`}
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
              <div className="mt-2">
                <div className="truncate font-content text-lg text-parchment">{release.title}</div>
                <div className="truncate text-[11px] text-parchment/40">
                  {release.items.length} tracks · {formatTotal(release.totalDurationMs)}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
