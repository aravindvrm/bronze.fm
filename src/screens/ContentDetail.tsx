import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { usePlayer } from '@/audio/playerStore'
import { content as adapter } from '@/content/adapter'
import { useCreator } from '@/content/CreatorContext'
import type { Content } from '@/content/types'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import { formatTime, formatTotal } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { OfflineControl } from '@/components/OfflineControl'
import { PlayIcon, PauseIcon } from '@/components/Icons'

/**
 * One Content, at `/{creator}/{content}`.
 *
 * The cover art that used to be a separate blocking splash is the hero here
 * instead — it belongs to the release, not to the app, now that the Creator
 * profile is the tenant root.
 */
export function ContentDetail() {
  const { contentSlug } = useParams()
  const creator = useCreator()
  const [item, setItem] = useState<Content | null | 'missing'>(null)

  const playingContentId = usePlayer((s) => s.content?.id ?? null)
  const index = usePlayer((s) => s.index)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playFrom = usePlayer((s) => s.playFrom)
  const toggle = usePlayer((s) => s.toggle)

  useEffect(() => {
    let cancelled = false
    setItem(null)
    void adapter.getContent(creator.slug, contentSlug ?? '').then((c) => {
      if (!cancelled) setItem(c ?? 'missing')
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug, contentSlug])

  if (item === 'missing') {
    return (
      <div className="min-h-full bg-void">
        <ScreenHeader title="Not found" />
        <p className="px-5 text-sm text-parchment/50">
          <span className="text-gilt">{creator.name}</span> has nothing at{' '}
          <span className="text-gilt">/{contentSlug}</span>.
        </p>
      </div>
    )
  }
  if (!item) return <div className="min-h-full bg-void" />

  // "This release is the one playing" — the queue belongs to a Content, so a
  // different album playing must not light up rows here.
  const isCurrent = playingContentId === item.id
  const cover = coverUrl(item, 1200)

  const playAll = () => {
    if (isCurrent) toggle()
    else playFrom(item, 0)
  }

  return (
    <div className="min-h-full bg-void">
      <div className="relative">
        <motion.img
          src={cover}
          alt={`${item.title} cover`}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/*
          Real cover art is lit and busy where generated art was dark and flat,
          so the scrim carries the type rather than merely vignetting:
          transparent across the artwork's focal third, ramping to solid under
          the title.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-transparent via-40% to-void" />

        <div
          className="relative flex min-h-[52vh] flex-col justify-end px-5"
          style={{ paddingTop: 'calc(var(--safe-t) + 3.5rem)', paddingBottom: '1.5rem' }}
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="text-[10px] uppercase tracking-[0.4em] text-gilt/70"
          >
            {item.credits[0]?.name ?? creator.name}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="mt-2 font-content text-5xl tracking-tight text-parchment"
          >
            {item.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-2 text-xs text-parchment/40"
          >
            {item.items.length} tracks · {formatTotal(item.totalDurationMs)}
          </motion.p>

          <motion.button
            onClick={playAll}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            whileTap={{ scale: 0.96 }}
            aria-label={isCurrent && isPlaying ? 'Pause' : 'Play release'}
            className="mt-5 flex w-fit items-center gap-2 rounded-full bg-parchment px-5 py-2.5 text-void"
          >
            {isCurrent && isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
            <span className="text-[11px] uppercase tracking-[0.15em]">
              {isCurrent && isPlaying ? 'Pause' : 'Play'}
            </span>
          </motion.button>
        </div>

        <div className="absolute left-0 right-0 top-0">
          <ScreenHeader title="" transparent />
        </div>
      </div>

      <div className="px-5 pt-4">
        <OfflineControl content={item} />
      </div>

      <ul className="px-3 pt-2" style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}>
        {item.items.map((track, i) => {
          const active = isCurrent && i === index
          const feats = track.credits.filter((c) => c.role === 'featured')
          return (
            <motion.li
              key={track.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.35), duration: 0.45 }}
            >
              <button
                onClick={() => playFrom(item, i)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${
                  active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span className="relative shrink-0">
                  <img src={artUrl(track.hash, 'item', 128)} alt="" className="size-12 rounded-lg object-cover" />
                  {active && isPlaying && (
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-void/55">
                      <span className="flex items-end gap-[2px]">
                        {[0, 1, 2].map((b) => (
                          <motion.span
                            key={b}
                            className="w-[2px] bg-gilt"
                            animate={{ height: [4, 12, 6, 14, 4] }}
                            transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.16, ease: 'easeInOut' }}
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${active ? 'text-gilt' : 'text-parchment'}`}>
                    {track.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-parchment/40">
                    {track.isInterlude
                      ? 'Interlude'
                      : feats.length
                        ? `feat. ${feats.map((f) => f.name).join(', ')}`
                        : (track.credits[0]?.name ?? creator.name)}
                  </span>
                </span>

                <span className="shrink-0 text-[11px] tabular-nums text-parchment/35">
                  {formatTime(track.durationMs / 1000)}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
