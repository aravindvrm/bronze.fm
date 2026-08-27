import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_SEGMENT,
  type Content,
  type Creator,
  type Project,
} from '@/content/types'
import { creatorPath, defaultCreatorSlug, projectPath } from '@/lib/tenant'
import { coverUrl } from '@/lib/cover'
import { artUrl } from '@/lib/art'
import { formatRelative } from '@/lib/format'
import { Wordmark } from '@/components/Wordmark'
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

  const q = query.trim().toLowerCase()
  const shownCreators = useMemo(
    () => (q ? creators.filter((c) => c.name.toLowerCase().includes(q)) : creators),
    [creators, q],
  )
  const shownFeed = useMemo(
    () =>
      q
        ? feedItems.filter(
            ({ content, project }) =>
              content.title.toLowerCase().includes(q) ||
              project.title.toLowerCase().includes(q) ||
              (project.description ?? '').toLowerCase().includes(q),
          )
        : feedItems,
    [feedItems, q],
  )

  const nothing = q && shownCreators.length === 0 && shownFeed.length === 0

  return (
    <div className="min-h-full">
      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingTop: 'calc(var(--safe-t) + 2rem)', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Wordmark className="text-xl sm:text-2xl" />
        </motion.h1>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators and content"
          aria-label="Search creators and content"
          className="mt-5 w-full rounded-md border border-white/[0.14] bg-ink/60 px-4 py-2.5 text-sm text-parchment placeholder:text-parchment/30 focus:border-gilt/50 focus:outline-none"
        />

        {nothing && <p className="mt-8 text-sm text-parchment/40">Nothing matches “{query}”.</p>}

        {shownCreators.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3.5 text-[10px] uppercase tracking-[0.25em] text-parchment/40">Creators</h2>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-5">
              {shownCreators.map((creator, i) => (
                <motion.button
                  key={creator.id}
                  onClick={() => navigate(creatorPath(creator.slug))}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative aspect-square overflow-hidden rounded-md border border-white/[0.14] text-left"
                >
                  <img
                    src={creator.avatarUrl ?? artUrl(`${creator.slug}-hero`, 'cover', 600)}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block truncate font-display text-xl text-parchment">
                      {creator.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-parchment/50">
                      {projects.filter((p) => p.ownerSlug === creator.slug).length} projects
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {shownFeed.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3.5 text-[10px] uppercase tracking-[0.25em] text-parchment/40">Feed</h2>
            <div className="flex flex-col gap-2.5">
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
                    className="flex items-center gap-3 rounded-md border border-white/[0.14] bg-ink/40 p-2.5 text-left transition hover:border-white/25"
                  >
                    <img
                      src={coverUrl(project, 200)}
                      alt=""
                      className="size-14 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-content text-sm text-parchment">
                        {content.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-parchment/40">
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
