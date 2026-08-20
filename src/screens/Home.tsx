import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '@/audio/playerStore'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { formatTotal } from '@/lib/format'

const TILES = [
  { seg: 'music', label: 'Music', seed: 'tile-music', note: '' },
  { seg: 'videos', label: 'Videos', seed: 'tile-videos', note: 'Soon' },
  { seg: 'merch', label: 'Merch', seed: 'tile-merch', note: 'Soon' },
  { seg: 'events', label: 'Events', seed: 'tile-events', note: 'Soon' },
] as const

export function Home() {
  const navigate = useNavigate()
  const creator = useCreator()
  const content = usePlayer((s) => s.content)

  return (
    <div className="grain relative min-h-full overflow-hidden bg-void">
      <img
        src={artUrl(`${content?.slug ?? 'bronze'}-cover`, 'cover', 1000)}
        alt=""
        className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] w-full object-cover opacity-30 blur-2xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/50 via-void/85 to-void" />

      <div
        className="relative px-5"
        style={{ paddingTop: 'calc(var(--safe-t) + 3.5rem)', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-gilt/70">{creator.name}</p>
          <h1 className="mt-2 font-display text-5xl tracking-tight text-parchment">{content?.title}</h1>
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
