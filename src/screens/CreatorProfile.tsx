import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import type { Content } from '@/content/types'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import { EventsIcon, MerchIcon, MusicIcon } from '@/components/Icons'

/**
 * The Creator's profile — the tenant root at `/robotrebel`.
 *
 * Three sections, all Creator-wide. Releases leads to the records; Merch and
 * Events show everything the Creator has, of which a release's own sections
 * are a tagged subset.
 *
 * Videos deliberately has no tile here: videos live inside a release.
 */
const SECTIONS = [
  { seg: 'releases', label: 'Releases', seed: 'tile-releases', note: '', Icon: MusicIcon },
  { seg: 'merch', label: 'Merch', seed: 'tile-merch', note: 'Soon', Icon: MerchIcon },
  { seg: 'events', label: 'Events', seed: 'tile-events', note: 'Soon', Icon: EventsIcon },
] as const

export function CreatorProfile() {
  const navigate = useNavigate()
  const creator = useCreator()
  const [featured, setFeatured] = useState<Content | null>(null)

  useEffect(() => {
    let cancelled = false
    void adapter.listContent(creator.slug, 'music').then((r) => {
      if (!cancelled) setFeatured(r[0] ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug])

  return (
    <div className="grain relative min-h-full overflow-hidden bg-void">
      {/*
        The Creator has no artwork of its own, so it borrows the latest
        release's — which is also what a visitor sees one tap later.
      */}
      <img
        src={featured ? coverUrl(featured, 1000) : artUrl(`${creator.slug}-hero`, 'cover', 1000)}
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover blur-lg"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/40 via-transparent via-40% to-void" />

      <div
        className="relative px-5"
        style={{ paddingTop: 'calc(var(--safe-t) + 3.5rem)', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {/* Glass panel: the cover runs bright behind this, and the Creator's
            name is the one thing here with no artwork of its own to sit on. */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-white/10 bg-ink/50 px-5 py-4 backdrop-blur-xl"
        >
          {/* Creator names are identity, not a Content title, so they stay on
              the app face rather than the release's. */}
          <h1 className="font-display text-5xl tracking-tight text-parchment">{creator.name}</h1>
          {creator.bio && (
            <p className="mt-3 text-sm leading-relaxed text-parchment/50">{creator.bio}</p>
          )}
        </motion.header>

        <div className="mt-8 grid grid-cols-2 gap-3.5">
          {SECTIONS.map((tile, i) => (
            <motion.button
              key={tile.seg}
              onClick={() => navigate(creatorPath(creator.slug, tile.seg))}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + i * 0.09, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 text-left"
            >
              <img
                src={artUrl(tile.seed, 'item', 600)}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/25 to-transparent" />
              <tile.Icon className="absolute left-4 top-4 size-7 text-gilt drop-shadow-[0_1px_6px_rgba(10,7,5,0.9)]" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                <span className="font-display text-xl text-parchment">{tile.label}</span>
                {tile.note && (
                  <span className="rounded-full border border-gilt/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-gilt/70">
                    {tile.note}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
