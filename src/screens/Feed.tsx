import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import type { Creator, Project } from '@/content/types'
import { creatorPath, defaultCreatorSlug } from '@/lib/tenant'
import { coverUrl } from '@/lib/cover'
import { Wordmark } from '@/components/Wordmark'

/**
 * The app root — everything published, and a way to search it.
 *
 * One creator exists today, so this reads as Dean's shelf; the shape is the
 * platform's, not his, which is why creators and projects are separate
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

  const q = query.trim().toLowerCase()
  const shownCreators = useMemo(
    () => (q ? creators.filter((c) => c.name.toLowerCase().includes(q)) : creators),
    [creators, q],
  )
  const shownProjects = useMemo(
    () =>
      q
        ? projects.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              (p.description ?? '').toLowerCase().includes(q) ||
              p.contents.some((c) => c.title.toLowerCase().includes(q)),
          )
        : projects,
    [projects, q],
  )

  const nothing = q && shownCreators.length === 0 && shownProjects.length === 0

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
          placeholder="Search creators and work"
          aria-label="Search creators and work"
          className="mt-5 w-full rounded-md border border-white/[0.14] bg-ink/60 px-4 py-2.5 text-sm text-parchment placeholder:text-parchment/30 focus:border-gilt/50 focus:outline-none"
        />

        {nothing && <p className="mt-8 text-sm text-parchment/40">Nothing matches “{query}”.</p>}

        {shownCreators.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3.5 text-[10px] uppercase tracking-[0.25em] text-parchment/40">Creators</h2>
            <div className="flex flex-col gap-2.5">
              {shownCreators.map((creator) => (
                <button
                  key={creator.id}
                  onClick={() => navigate(creatorPath(creator.slug))}
                  className="flex items-center gap-3 rounded-md border border-white/[0.14] bg-ink/40 p-3 text-left transition hover:border-white/25"
                >
                  <img
                    src={coverUrl(projects.find((p) => p.ownerSlug === creator.slug), 200)}
                    alt=""
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg text-parchment">
                      {creator.name}
                    </span>
                    <span className="block truncate text-[11px] text-parchment/40">
                      {projects.filter((p) => p.ownerSlug === creator.slug).length} projects
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {shownProjects.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3.5 text-[10px] uppercase tracking-[0.25em] text-parchment/40">Work</h2>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-5">
              {shownProjects.map((project, i) => (
                <motion.button
                  key={project.id}
                  onClick={() => navigate(creatorPath(project.ownerSlug, project.slug))}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative aspect-square overflow-hidden rounded-md border border-white/[0.14] text-left"
                >
                  <img
                    src={coverUrl(project, 600)}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block truncate font-content text-xl text-parchment">
                      {project.title}
                    </span>
                    <span className="block truncate text-[11px] text-parchment/50">
                      {project.ownerSlug}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
