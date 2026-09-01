import { motion } from 'framer-motion'
import { usePlayer } from '@/audio/playerStore'
import { useProject } from '@/content/ProjectContext'
import { artUrl } from '@/lib/art'
import { headerBackgroundUrl } from '@/lib/cover'
import { formatTime } from '@/lib/format'
import { AppHeader } from '@/components/AppHeader'
import { OfflineControl } from '@/components/OfflineControl'
import { useCreator } from '@/content/CreatorContext'
import { projectPath } from '@/lib/tenant'

/** Track list for a Project's music interface, at `/@deanMaye/bronze/music`. */
export function Music() {
  const creator = useCreator()
  const project = useProject()
  // The route resolved to this screen because the Project holds a music
  // Content, so it is present by construction.
  const content = project.contents.find((c) => c.type === 'music')!
  const playingContentId = usePlayer((s) => s.content?.id ?? null)
  const index = usePlayer((s) => s.index)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const playFrom = usePlayer((s) => s.playFrom)

  // Rows light up only when THIS release is the one playing — another album
  // playing must not mark tracks here as current.
  const isCurrent = playingContentId === content.id

  const albumPrimary = content.credits[0]?.name ?? content.ownerSlug
  const headerBg = headerBackgroundUrl(project.slug)

  return (
    // `relative`, so the image below can be positioned against the WHOLE
    // page rather than needing a wrapper of its own. That distinction is
    // load-bearing: an intermediate div sized to just the header's height
    // was tried first, and it broke `position: sticky` on the header inside
    // it — sticky can only stay pinned as far as its own containing block
    // extends, and a block exactly as tall as the header gives it nowhere
    // to be sticky FOR. This container is the full page instead, so the
    // header keeps the entire scroll to stay pinned across, same as on
    // every other screen.
    <div className="relative min-h-full">
      {/*
        Full-bleed art behind the header bar itself, when the Project
        supplies one — Bronze's own back cover here. Absolutely positioned
        and sized to just the bar's own box (`var(--safe-t)` plus the `h-14`
        AppHeader uses) rather than a taller hero: this dresses the header,
        not the page, and the title below keeps the plain background it
        already had. `pointer-events-none` because it is decoration sitting
        behind the header's real controls, not a hit target of its own.
      */}
      {headerBg && (
        <>
          <img
            src={headerBg}
            alt=""
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--safe-t)+3.5rem)] w-full object-cover"
          />
          {/* A photo behind the bar still needs to lose evenly to it on
              scroll, the way the plain header's own tint does — without
              this, the image reappears at full strength through the blur's
              transparency the instant it's dark enough on its own to pass
              contrast unaided. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--safe-t)+3.5rem)] w-full bg-gradient-to-b from-scrim/35 to-scrim/10" />
        </>
      )}
      <AppHeader backTo={projectPath(creator.slug, project.slug)} onMedia={!!headerBg} />

      <div className="mx-auto max-w-3xl px-5 pb-2 sm:px-6">
        {/* The release's name, in the page rather than the bar: it can wrap
            here instead of truncating at a phone's width. */}
        <h1 className="text-3xl leading-tight text-parchment sm:text-4xl">{content.title}</h1>
        <div className="mt-5">
          <OfflineControl content={content} />
        </div>
      </div>

      {/* Narrower than the grids above: a track row is title on the left and a
          duration on the right, so at full width the two ends drift apart with
          nothing between them. */}
      <ul
        className="mx-auto max-w-3xl px-3 sm:px-6"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {content.items.map((item, i) => {
          const active = isCurrent && i === index
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.4), duration: 0.5 }}
            >
              <button
                onClick={() => playFrom(content, i)}
                className={`flex w-full items-center gap-3 px-2 py-2.5 text-left transition ${
                  active ? 'bg-parchment/[0.07]' : 'hover:bg-parchment/[0.04]'
                }`}
              >
                <span className="relative shrink-0">
                  <img
                    src={artUrl(item.hash, 'item', 128)}
                    alt=""
                    className="size-12 object-cover"
                  />
                  {active && isPlaying && (
                    <span className="absolute inset-0 grid place-items-center bg-void/55">
                      <span className="flex items-end gap-[2px]">
                        {[0, 1, 2].map((b) => (
                          <motion.span
                            key={b}
                            className="w-[2px] bg-gilt"
                            animate={{ height: [4, 12, 6, 14, 4] }}
                            transition={{
                              duration: 1.1,
                              repeat: Infinity,
                              delay: b * 0.16,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${active ? 'text-ember' : 'text-parchment'}`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-parchment/40">
                    {(() => {
                      if (item.isInterlude) return 'Interlude'
                      const feats = item.credits.filter((c) => c.role === 'featured')
                      if (feats.length) return `feat. ${feats.map((f) => f.name).join(', ')}`
                      return item.credits[0]?.name ?? albumPrimary
                    })()}
                  </span>
                </span>

                <span className="shrink-0 text-[11px] tabular-nums text-parchment/35">
                  {formatTime(item.durationMs / 1000)}
                </span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
