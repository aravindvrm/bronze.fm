import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_SEGMENT,
  type Content,
  type ContentType,
  type Creator,
  type Project,
} from '@/content/types'
import { creatorPath, defaultCreatorSlug, projectPath } from '@/lib/tenant'
import { coverUrl } from '@/lib/cover'
import { artUrl } from '@/lib/art'
import { formatRelative } from '@/lib/format'
import { AppHeader } from '@/components/AppHeader'
import { MusicIcon, ReadIcon, VideosIcon } from '@/components/Icons'

const TYPE_ICON = { music: MusicIcon, video: VideosIcon, ereader: ReadIcon } as const

/** One published interface, carrying the Project it belongs to for its link. */
interface FeedItem {
  content: Content
  project: Project
}

/**
 * The app root — everything published, and a way to search it.
 *
 * One creator exists today, so this reads as Dean's shelf; the shape is the
 * platform's, not his, which is why creators and the feed are separate
 * sections rather than one merged list.
 *
 * Search is client-side and unindexed on purpose: the corpus is a handful of
 * rows, so filtering in memory is both simpler and faster than a round trip,
 * and it keeps working offline against the cached shell. It becomes a real
 * query when there is enough content to justify one.
 */
export function Feed() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState<Creator[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // A creators-listing endpoint does not exist yet; the feed shows the
      // one known Creator until it does.
      const creator = await adapter.getCreator(defaultCreatorSlug())
      if (cancelled || !creator) return
      const owned = await adapter.listProjects(creator.slug)
      if (cancelled) return
      setCreators([creator])
      setProjects(owned)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const creatorName = useMemo(
    () => new Map(creators.map((c) => [c.slug, c.name])),
    [creators],
  )

  /*
   * Flattened to one entry per typed interface, not per Project: a Project
   * that later gains a second interface (Atonomos plus audio, say) should
   * appear as two feed entries, each dated by when that interface itself was
   * published, not collapsed into one row for the Project as a whole.
   */
  const feedItems = useMemo(() => {
    const items: FeedItem[] = projects.flatMap((project) =>
      project.contents.map((content) => ({ content, project })),
    )
    return items.sort((a, b) => (b.content.createdAt ?? '').localeCompare(a.content.createdAt ?? ''))
  }, [projects])

  /*
   * Only types actually present get a chip — a "Video" filter that always
   * returns nothing yet would be an affordance for a feature that doesn't
   * exist, the same reasoning behind not showing a search "clear" toggle
   * with nothing typed. Order follows CONTENT_TYPE_LABEL's own key order
   * rather than first-appearance, so the row doesn't reshuffle as new
   * content publishes.
   */
  const availableTypes = useMemo(() => {
    const present = new Set(feedItems.map((i) => i.content.type))
    return (Object.keys(CONTENT_TYPE_LABEL) as ContentType[]).filter((t) => present.has(t))
  }, [feedItems])

  const q = query.trim().toLowerCase()
  const shownCreators = useMemo(
    () => (q ? creators.filter((c) => c.name.toLowerCase().includes(q)) : creators),
    [creators, q],
  )
  const shownFeed = useMemo(
    () =>
      feedItems.filter(({ content, project }) => {
        if (typeFilter !== 'all' && content.type !== typeFilter) return false
        if (!q) return true
        return (
          content.title.toLowerCase().includes(q) ||
          project.title.toLowerCase().includes(q) ||
          (project.description ?? '').toLowerCase().includes(q)
        )
      }),
    [feedItems, q, typeFilter],
  )

  const nothing = q && shownCreators.length === 0 && shownFeed.length === 0

  return (
    <div className="min-h-full">
      <AppHeader query={query} onQueryChange={setQuery} />

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingTop: '1.75rem', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {/* The visible wordmark is in the header and is a link, not a
            heading, so the page would otherwise have no h1 for a screen
            reader to announce or navigate by. */}
        <h1 className="sr-only">bronze.fm</h1>

        {nothing && <p className="mb-8 text-sm text-parchment/40">Nothing matches “{query}”.</p>}

        {shownCreators.length > 0 && (
          <section>
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight text-parchment">
                Featured Creators
              </h2>
            </div>

            {/*
              A rail rather than the grid this used to be. It scrolls
              horizontally on every viewport, so the section keeps one
              behaviour instead of being a grid on desktop and a rail on a
              phone — and it stays honest at the current count: one creator
              simply renders one card and the rail grows as creators join,
              rather than being padded out with invented people.

              `snap` on the items and none on the container's own padding
              keeps the first card flush to the page margin while later
              cards still land cleanly under a swipe.
            */}
            <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 no-scrollbar sm:-mx-8 sm:px-8">
              {shownCreators.map((creator, i) => (
                <motion.button
                  key={creator.id}
                  onClick={() => navigate(creatorPath(creator.slug))}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex w-[5.5rem] shrink-0 snap-start flex-col items-center gap-2 text-center"
                >
                  <img
                    src={creator.avatarUrl ?? artUrl(`${creator.slug}-hero`, 'cover', 300)}
                    alt=""
                    className="size-[5.5rem] rounded-full border border-parchment/15 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="w-full font-mono text-[11px] leading-tight text-parchment/70">
                    {creator.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {feedItems.length > 0 && (
          <section className="mt-10">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight text-parchment">Feed</h2>

              {/* A single type has nothing to filter, so the row only earns
                  its place once there is a real choice to make. */}
              {availableTypes.length > 1 && (
                <div className="flex gap-1.5">
                  {(['all', ...availableTypes] as const).map((t) => {
                    const active = typeFilter === t
                    return (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        aria-pressed={active}
                        className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] transition ${
                          active
                            ? 'border-gilt/60 bg-gilt/15 text-gilt'
                            : 'border-parchment/20 text-parchment/40 hover:border-parchment/25 hover:text-parchment/70'
                        }`}
                      >
                        {t === 'all' ? 'All' : CONTENT_TYPE_LABEL[t]}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Search already explains an empty result up top — this is only
                for the case a type filter alone empties the list. */}
            {!q && shownFeed.length === 0 && (
              <p className="text-sm text-parchment/40">Nothing matches the filter.</p>
            )}

            <div className="flex flex-col gap-2.5" data-testid="feed-rows">
              {shownFeed.map(({ content, project }, i) => {
                const Icon = TYPE_ICON[content.type]
                return (
                  <motion.button
                    key={content.id}
                    onClick={() =>
                      navigate(
                        projectPath(project.ownerSlug, project.slug, CONTENT_TYPE_SEGMENT[content.type]),
                      )
                    }
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-3 border border-parchment/25 bg-ink/40 p-2.5 text-left transition hover:border-parchment/25"
                  >
                    <img
                      src={coverUrl(project, 200)}
                      alt=""
                      className="size-14 shrink-0 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-content text-sm text-parchment">
                        {content.title}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-parchment/40">
                        {creatorName.get(project.ownerSlug) ?? project.ownerSlug} · {CONTENT_TYPE_LABEL[content.type]}
                        {content.createdAt && <> · {formatRelative(content.createdAt)}</>}
                      </span>
                    </span>
                    <Icon className="size-5 shrink-0 text-gilt/70" />
                  </motion.button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
