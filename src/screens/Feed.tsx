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
import { Select, type SelectOption } from '@/components/Select'

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
 * No search here any more. It used to filter this page's own rows, which
 * looked like search and was not: the page loads one creator, so a query for
 * anyone else matched nothing and always would have, however many creators
 * existed. Search is `/search` now, over the adapter, and this screen keeps
 * only the type filter — which really is a filter over what is on it.
 */
export function Feed() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState<Creator[]>([])
  const [projects, setProjects] = useState<Project[]>([])
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

  const creatorName = useMemo(() => new Map(creators.map((c) => [c.slug, c.name])), [creators])

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
    return items.sort((a, b) =>
      (b.content.createdAt ?? '').localeCompare(a.content.createdAt ?? ''),
    )
  }, [projects])

  /*
   * Only types actually present get an entry — a "Video" filter that always
   * returns nothing yet would be an affordance for a feature that doesn't
   * exist, the same reasoning behind not showing a search "clear" toggle
   * with nothing typed. Order follows CONTENT_TYPE_LABEL's own key order
   * rather than first-appearance, so the list doesn't reshuffle as new
   * content publishes.
   */
  const availableTypes = useMemo(() => {
    const present = new Set(feedItems.map((i) => i.content.type))
    return (Object.keys(CONTENT_TYPE_LABEL) as ContentType[]).filter((t) => present.has(t))
  }, [feedItems])

  /*
   * Each option carries its count.
   *
   * The number is the question people open a type filter to ask — whether
   * there is anything under it worth the tap — and a list can answer that
   * where a row of chips had nowhere to put it. Counted before the search
   * term is applied, so the figures describe the feed rather than the
   * current query; a count that moved as you typed would be reporting on
   * the search, not the library.
   */
  const typeOptions = useMemo<SelectOption<ContentType | 'all'>[]>(() => {
    const count = (t: ContentType) => feedItems.filter((i) => i.content.type === t).length
    return [
      { value: 'all' as const, label: 'All', hint: String(feedItems.length) },
      ...availableTypes.map((t) => ({
        value: t,
        label: CONTENT_TYPE_LABEL[t],
        hint: String(count(t)),
      })),
    ]
  }, [feedItems, availableTypes])

  /*
   * Only the type filter now. Search moved to its own screen and its own
   * route, because filtering here could only ever hide rows this page had
   * already loaded — and this page loads one creator, so searching for
   * anybody else returned nothing and always would have.
   */
  const shownCreators = creators
  const shownFeed = useMemo(
    () => feedItems.filter(({ content }) => typeFilter === 'all' || content.type === typeFilter),
    [feedItems, typeFilter],
  )

  return (
    <div className="min-h-full">
      <AppHeader />

      {/* The visible wordmark is in the header and is a link, not a
          heading, so the page would otherwise have no h1 for a screen
          reader to announce or navigate by. */}
      <h1 className="sr-only">bronze.fm</h1>

      {shownCreators.length > 0 && (
        /*
          A band, full-bleed rather than inset.

          The home page was two lists on one white ground with nothing to say
          where the first ended and the second began. `ink` is the token for
          precisely this — a surface raised off the page — which is why the
          band needs no border or shadow to read as its own thing, and why it
          becomes a subtle LIFT rather than a grey slab under the dark theme
          without anything here knowing about that.

          It sits outside the content column so the colour runs edge to edge,
          with its own column within. A band stopping at the 72rem ceiling
          would read as a very wide card on a desktop rather than as a
          section of the page. Flush to the header for the same reason: a gap
          above it would leave a white stripe between the header and the
          band, which looks like a mistake rather than a margin.
        */
        <section className="bg-ink">
          {/*
            12px of air, on all three of the gaps this owns: above the
            heading, between the heading and the rail, and below the labels.
            It began at 28 over 32 — generous, and heavier at the foot than
            the head, which read as the band drifting downward rather than
            sitting on the page.

            The three are written as different numbers to come out the same,
            which is worth knowing before "fixing" them. The rail carries
            `pt-2` and `pb-2` of its own so the avatars' rings are not
            clipped by its `overflow-x: auto`, so `pt-3` above, `mb-1` in the
            middle and `pb-1` below all land at 12.

            The band is 176px tall now against the avatar's 88 — most of what
            is left is the content itself.
          */}
          <div className="mx-auto max-w-[var(--app-w)] px-5 pb-1 pt-3 sm:px-8">
            <div className="mb-1 flex items-baseline justify-between gap-3">
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
            <div // `pt-2` matching `pb-2` is not decoration: `overflow-x: auto` forces
              // the block to clip vertically as well, and the avatars carry a
              // ring drawn OUTSIDE their box plus a hover scale. Without room
              // above, the top of every circle is shaved off.
              className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 pt-2 no-scrollbar sm:-mx-8 sm:px-8"
            >
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
                    // Same accent ring the profile avatar carries, so a creator looks
                    // like themselves in both places.
                    className="size-[5.5rem] rounded-full object-cover ring-2 ring-ember/50 transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="w-full font-mono text-[13px] leading-tight text-parchment/80">
                    {creator.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingTop: '2.5rem', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {feedItems.length > 0 && (
          <section>
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight text-parchment">
                Feed
              </h2>

              {/* A single type has nothing to filter, so the control only
                  earns its place once there is a real choice to make. */}
              {availableTypes.length > 1 && (
                <Select
                  label="Filter the feed by type"
                  value={typeFilter}
                  options={typeOptions}
                  onChange={setTypeFilter}
                  accented={typeFilter !== 'all'}
                />
              )}
            </div>

            {/* The only way to empty this list now is the type filter. */}
            {shownFeed.length === 0 && (
              <p className="text-sm text-parchment/40">Nothing matches the filter.</p>
            )}

            {/* Rules between rows rather than a card each. The cards were
                doing no work the list itself does not already do — every row
                is the same shape — and a stack of filled rectangles competes
                with the cover art, which is the one thing here that should
                carry colour. `divide-y` puts the rule only BETWEEN rows, so
                the list has no stray edge above the first or below the last. */}
            <div className="flex flex-col divide-y divide-parchment/15" data-testid="feed-rows">
              {shownFeed.map(({ content, project }, i) => {
                const Icon = TYPE_ICON[content.type]
                return (
                  <motion.button
                    key={content.id}
                    onClick={() =>
                      navigate(
                        projectPath(
                          project.ownerSlug,
                          project.slug,
                          CONTENT_TYPE_SEGMENT[content.type],
                        ),
                      )
                    }
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.99 }}
                    // Negative inline margin plus matching padding: the tint
                    // on hover reaches the page margin, so it reads as the
                    // row lighting up rather than a floating band inset from
                    // the text it belongs to.
                    className="-mx-2 flex items-center gap-3 px-2 py-3 text-left transition hover:bg-parchment/[0.04]"
                  >
                    <img
                      src={coverUrl(project, 200)}
                      alt=""
                      className="size-14 shrink-0 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-parchment">{content.title}</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-parchment/40">
                        {creatorName.get(project.ownerSlug) ?? project.ownerSlug} ·{' '}
                        {CONTENT_TYPE_LABEL[content.type]}
                        {content.createdAt && <> · {formatRelative(content.createdAt)}</>}
                      </span>
                    </span>
                    <Icon className="size-5 shrink-0 text-ember/70" />
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
