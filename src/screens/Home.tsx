import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '@/audio/playerStore'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import { formatTotal } from '@/lib/format'
import { EventsIcon, MerchIcon, MusicIcon, VideosIcon } from '@/components/Icons'

const TILES = [
  { seg: 'music', label: 'Music', seed: 'tile-music', note: '', Icon: MusicIcon },
  { seg: 'videos', label: 'Videos', seed: 'tile-videos', note: 'Soon', Icon: VideosIcon },
  { seg: 'merch', label: 'Merch', seed: 'tile-merch', note: 'Soon', Icon: MerchIcon },
  { seg: 'events', label: 'Events', seed: 'tile-events', note: 'Soon', Icon: EventsIcon },
] as const

export function Home() {
  const navigate = useNavigate()
  const creator = useCreator()
  const content = usePlayer((s) => s.content)

  return (
    <div className="grain relative min-h-full overflow-hidden bg-void">
      {/*
        The splash treatment, blurred: same full-bleed cover, same scrim. Home is
        where you land straight off the splash, so sharing the backdrop makes the
        transition continuous — blur is the only thing separating them.
      */}
      <img
        src={coverUrl(content, 1000)}
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
          title is the one thing on the screen with no artwork of its own to sit
          on. Same treatment as the mini player so the app has one glass idiom.
        */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-white/10 bg-ink/50 px-5 py-4 backdrop-blur-xl"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-gilt/70">{creator.name}</p>
          <h1 className="mt-2 font-content text-5xl tracking-tight text-parchment">{content?.title}</h1>
          <p className="mt-2 text-xs text-parchment/40">
            {content?.items.length} tracks · {content ? formatTotal(content.totalDurationMs) : ''}
          </p>
        </motion.header>

        <div className="mt-10 grid grid-cols-2 gap-3.5">
          {TILES.map((tile, i) => (
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
