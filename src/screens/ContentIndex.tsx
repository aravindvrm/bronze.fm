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

/**
 * The Creator's Content — matches the `content` table name directly, so the
 * URL segment, the tile label, and the schema all use the same noun.
 *
 * Named ContentIndex rather than Content: this file already imports the
 * `Content` type for the item shape, and a component of the same name would
 * shadow it.
 */
export function ContentIndex() {
  const navigate = useNavigate()
  const creator = useCreator()
  const [items, setItems] = useState<Content[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void adapter.listContent(creator.slug, 'music').then((r) => {
      if (!cancelled) setItems(r)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug])

  return (
    <div className="min-h-full bg-void">
      <ScreenHeader title="Content" />

      <div className="px-5" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        {items?.length === 0 && (
          <p className="text-xs text-parchment/40">No content yet.</p>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          {(items ?? []).map((item, i) => (
            <motion.button
              key={item.id}
              onClick={() => navigate(creatorPath(creator.slug, item.slug))}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
              className="text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-md border border-white/[0.14]">
                <img
                  src={coverUrl(item, 600)}
                  alt={`${item.title} cover`}
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
              <div className="mt-2">
                <div className="truncate font-content text-lg text-parchment">{item.title}</div>
                <div className="truncate text-[11px] text-parchment/40">
                  {item.items.length} tracks · {formatTotal(item.totalDurationMs)}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
