import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import type { Content } from '@/content/types'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import {
  EventsIcon,
  InstagramIcon,
  LinkedInIcon,
  MerchIcon,
  MusicIcon,
  SpotifyIcon,
  XIcon,
} from '@/components/Icons'

/**
 * Fixed order, so the row does not reshuffle as platforms are connected.
 *
 * A platform with no URL in `creator.socials` renders dimmed rather than
 * being dropped — the same "not yet" register as the SOON tags on the tiles
 * below. Hiding it would read as an oversight; linking a guessed handle would
 * point at someone else's account.
 */
const SOCIALS = [
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon },
  { key: 'x', label: 'X', Icon: XIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'spotify', label: 'Spotify', Icon: SpotifyIcon },
] as const

/**
 * The Creator's profile — the tenant root at `/robotrebel`.
 *
 * Three sections, all Creator-wide. Content leads to the records — the label
 * matches the schema's `content` table directly. Merch and Events show
 * everything the Creator has, of which a release's own sections are a tagged
 * subset.
 *
 * Videos deliberately has no tile here: videos live inside a release.
 */
const SECTIONS = [
  { seg: 'content', label: 'Content', seed: 'tile-content', note: '', Icon: MusicIcon },
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
    <div className="relative min-h-full overflow-hidden bg-void">
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
        className="relative mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingTop: 'calc(var(--safe-t) + 3.5rem)', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {/* Avatar overlaps the glass panel below it — the identity block a
            profile page needs, distinct from the release art it's cropped
            from. There is no dedicated Creator photo yet, so the featured
            release's cover stands in, sharp rather than the blurred wash
            behind it. */}
        <motion.img
          src={featured ? coverUrl(featured, 300) : artUrl(`${creator.slug}-hero`, 'cover', 300)}
          alt=""
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 size-24 rounded-full border-2 border-void object-cover shadow-[0_4px_20px_rgba(0,0,0,0.5)] sm:size-32"
        />

        {/* Glass panel: the cover runs bright behind this, and the Creator's
            name is the one thing here with no artwork of its own to sit on. */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="-mt-4 rounded-md border border-white/[0.14] bg-ink/50 px-5 pb-4 pt-8 backdrop-blur-xl"
        >
          {/* Creator names are identity, not a Content title, so they stay on
              the app face rather than the release's. */}
          <h1 className="font-display text-4xl tracking-tight text-parchment sm:text-6xl">{creator.name}</h1>
          {creator.bio && (
            <p className="mt-3 text-sm leading-relaxed text-parchment/50">{creator.bio}</p>
          )}

          <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.08] pt-4">
            {SOCIALS.map(({ key, label, Icon }) => {
              const href = creator.socials?.[key]
              return href ? (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  // noreferrer as well as noopener: the target should not
                  // learn which profile the visitor came from.
                  rel="noopener noreferrer"
                  title={label}
                  aria-label={`${creator.name} on ${label}`}
                  className="grid size-9 place-items-center rounded-full border border-gilt/40 text-gilt transition hover:border-gilt hover:bg-gilt/10"
                >
                  <Icon className="size-4" />
                </a>
              ) : (
                <span
                  key={key}
                  title={`${label} — not connected yet`}
                  className="grid size-9 place-items-center rounded-full border border-white/10 text-parchment/25"
                >
                  <Icon className="size-4" />
                </span>
              )
            })}
          </div>
        </motion.header>

        <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5">
          {SECTIONS.map((tile, i) => (
            <motion.button
              key={tile.seg}
              onClick={() => navigate(creatorPath(creator.slug, tile.seg))}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + i * 0.09, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
              className="group relative aspect-square overflow-hidden rounded-md border border-white/[0.14] text-left"
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
