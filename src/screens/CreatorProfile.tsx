import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import type { Content } from '@/content/types'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import { formatTotal } from '@/lib/format'
import { EventsIcon, MerchIcon, MusicIcon, VideosIcon } from '@/components/Icons'

const SECTIONS = [
  { seg: 'music', label: 'Music', seed: 'tile-music', note: '', Icon: MusicIcon },
  { seg: 'videos', label: 'Videos', seed: 'tile-videos', note: 'Soon', Icon: VideosIcon },
  { seg: 'merch', label: 'Merch', seed: 'tile-merch', note: 'Soon', Icon: MerchIcon },
  { seg: 'events', label: 'Events', seed: 'tile-events', note: 'Soon', Icon: EventsIcon },
] as const

/**
 * The Creator's profile — the tenant root at `/dean`.
 *
 * Content lives one level down (`/dean/bronze`), so this is about the Creator
 * rather than any single release. Merch and Events are Creator-scoped in the
 * schema, which is why the sections hang off here and not off a release.
 */
export function CreatorProfile() {
  const navigate = useNavigate()
  const creator = useCreator()
  const [releases, setReleases] = useState<Content[]>([])

  useEffect(() => {
    let cancelled = false
    void adapter.listContent(creator.slug, 'music').then((r) => {
      if (!cancelled) setReleases(r)
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug])

  const featured = releases[0]

  return (
    <div className="grain relative min-h-full overflow-hidden bg-void">
      {/*
        Full-bleed blurred cover, carried over from the home treatment. The
        Creator profile has no artwork of its own, so it borrows the latest
        release's — which is also what the visitor sees one tap later, keeping
        the transition continuous.
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
        {/*
          Glass panel: the cover backdrop runs bright behind this text, and the
          Creator's name is the one thing here with no artwork of its own to sit
          on. Same treatment as the mini player, so the app has one glass idiom.
        */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-white/10 bg-ink/50 px-5 py-4 backdrop-blur-xl"
        >
          {/* The Creator's name is app-level identity, not a Content title, so
              it stays on the app face rather than the release's. */}
          <h1 className="font-display text-5xl tracking-tight text-parchment">{creator.name}</h1>
          {creator.bio && <p className="mt-3 max-w-prose text-sm leading-relaxed text-parchment/50">{creator.bio}</p>}
        </motion.header>

        {featured && (
          <motion.button
            onClick={() => navigate(creatorPath(creator.slug, featured.slug))}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.985 }}
            className="group relative mt-8 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left"
          >
            <img
              src={coverUrl(featured, 400)}
              alt=""
              className="size-20 shrink-0 rounded-xl object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-[0.22em] text-gilt/70">Latest release</span>
              <span className="mt-1 block truncate font-content text-2xl text-parchment">{featured.title}</span>
              <span className="mt-0.5 block text-[11px] text-parchment/40">
                {featured.items.length} tracks · {formatTotal(featured.totalDurationMs)}
              </span>
            </span>
          </motion.button>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3.5">
          {SECTIONS.map((tile, i) => (
            <motion.button
              key={tile.seg}
              onClick={() => navigate(creatorPath(creator.slug, tile.seg))}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.09, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 text-left"
            >
              <img
                src={artUrl(tile.seed, 'item', 600)}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/25 to-transparent" />
              {/* Top-left, mirroring the label below it. Drop shadow because the
                  scrim is thinnest here, over the brightest part of the art. */}
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
