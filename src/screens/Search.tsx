import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { SEARCH_PLACEHOLDER, isQueryable, totalHits } from '@/content/search'
import type { SearchHit, SearchResults } from '@/content/types'
import { AppHeader } from '@/components/AppHeader'
import { artUrl } from '@/lib/art'
import { SearchIcon } from '@/components/Icons'

/**
 * Search — `/search?q=…`.
 *
 * A screen rather than a filter over the home page, which is what this
 * replaced. The old behaviour could only ever hide rows the feed had already
 * loaded, and the feed loads one creator: searching for anyone else returned
 * nothing, and would have gone on returning nothing however many creators
 * existed. Nothing about it looked broken, which is the worst version of
 * broken.
 *
 * The query lives in the URL. That is what makes a search shareable, what
 * puts it in history so Back leaves it rather than clearing the field, and
 * what lets the header's quick hits hand off to this screen by navigating
 * rather than by passing state.
 */

const GROUPS = [
  { key: 'creators', label: 'Creators' },
  { key: 'projects', label: 'Projects' },
  { key: 'contents', label: 'Content' },
] as const

/** How many of a group to show before offering the rest. */
const PREVIEW = 5

export function Search() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''

  const [draft, setDraft] = useState(urlQuery)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // The field owns the caret; the URL owns the query. They are synced one way
  // — URL into field — so arriving by link or by Back fills the box, while
  // typing does not rewrite history on every keystroke.
  useEffect(() => setDraft(urlQuery), [urlQuery])
  useEffect(() => inputRef.current?.focus(), [])

  /*
   * Debounced, and cancelled on the way out.
   *
   * `stale` rather than an AbortController because the adapter is an
   * interface over two very different transports and only one of them has a
   * request to abort. Ignoring a late answer is the part that matters: without
   * it, a slow response to "de" can land after a fast one to "dean" and put
   * the wrong results under the right query.
   */
  useEffect(() => {
    const query = draft.trim()
    if (!isQueryable(query)) {
      setResults(null)
      setLoading(false)
      return
    }
    let stale = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      void adapter
        .search(query)
        .then((found) => {
          if (stale) return
          setResults(found)
          setExpanded(null)
        })
        .finally(() => {
          if (!stale) setLoading(false)
        })
      // The URL catches up once typing settles, so history holds searches
      // rather than every prefix of one.
      setParams(query ? { q: query } : {}, { replace: true })
    }, 220)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [draft, setParams])

  const total = results ? totalHits(results) : 0
  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, hits: results?.[g.key] ?? [] })).filter((g) => g.hits.length),
    [results],
  )

  return (
    <div className="min-h-full">
      <AppHeader backTo="/" />

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 pt-6 sm:px-8"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        <h1 className="sr-only">Search</h1>

        {/* The field is the screen's own, not the header's. One input, and
            the one that owns the URL. */}
        <div className="flex items-center gap-3 border-b border-parchment/25 pb-3">
          <SearchIcon className="size-5 shrink-0 text-parchment/40" />
          <input
            ref={inputRef}
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_PLACEHOLDER}
            className="min-w-0 flex-1 bg-transparent text-lg text-parchment caret-ember placeholder:text-parchment/35 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>

        <div aria-live="polite" className="mt-6">
          {!isQueryable(draft.trim()) ? (
            <p className="text-sm text-parchment/40">
              Type at least two characters to search creators, projects and content.
            </p>
          ) : loading && !results ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-parchment/35">
              Searching…
            </p>
          ) : total === 0 ? (
            <p className="text-sm text-parchment/40">Nothing matches “{draft.trim()}”.</p>
          ) : (
            <div className="space-y-9">
              {groups.map((group) => {
                const showAll = expanded === group.key
                const shown = showAll ? group.hits : group.hits.slice(0, PREVIEW)
                return (
                  <section key={group.key}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/45">
                        {group.label}
                      </h2>
                      <span className="font-mono text-[10px] tabular-nums text-parchment/35">
                        {group.hits.length}
                      </span>
                    </div>

                    <ul className="divide-y divide-parchment/10 border-t border-parchment/10">
                      {shown.map((hit, i) => (
                        <Row key={hit.id} hit={hit} index={i} onOpen={() => navigate(hit.href)} />
                      ))}
                    </ul>

                    {group.hits.length > PREVIEW && (
                      <button
                        onClick={() => setExpanded(showAll ? null : group.key)}
                        className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ember transition hover:opacity-80"
                      >
                        {showAll ? 'Show fewer' : `Show all ${group.hits.length}`}
                      </button>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ hit, index, onOpen }: { hit: SearchHit; index: number; onOpen: () => void }) {
  /*
   * The picture comes from the hit, not from a rule here.
   *
   * The adapters already know a creator's avatar and a project's cover, and
   * deriving them a second time in the row is how the same creator ends up
   * with one face in a search result and another in the rail.
   */
  const image =
    hit.imageUrl ?? (hit.kind === 'creator' ? artUrl(`${hit.id}-hero`, 'cover', 120) : undefined)

  return (
    <li>
      <motion.button
        onClick={onOpen}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        // Capped, so the twentieth row does not arrive a second and a half
        // after the first.
        transition={{ delay: Math.min(index * 0.025, 0.2), duration: 0.35 }}
        className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-parchment/[0.04]"
      >
        {image ? (
          <img
            src={image}
            alt=""
            className={`size-10 shrink-0 object-cover ${
              hit.kind === 'creator' ? 'rounded-full ring-1 ring-ember/50' : ''
            }`}
          />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center border border-parchment/20 font-mono text-[10px] text-parchment/40">
            {hit.title.slice(0, 1).toUpperCase()}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] text-parchment">{hit.title}</span>
          {hit.subtitle && (
            <span className="mt-0.5 block truncate font-mono text-[11px] text-parchment/45">
              {hit.subtitle}
            </span>
          )}
        </span>

        {/*
          The kind, as a badge rather than as more subtitle.
          
          A release and its project come back with the same words and the
          same cover, so the only thing separating the two rows is what kind
          of thing each is — and that reads as a label at a glance where it
          disappeared into a line of prose.
        */}
        {hit.badge && (
          <span className="shrink-0 border border-ember/35 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ember/80">
            {hit.badge}
          </span>
        )}
      </motion.button>
    </li>
  )
}
