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
import { creatorPath, projectPath } from '@/lib/tenant'
import { coverUrl } from '@/lib/cover'
import { artUrl } from '@/lib/art'
import { formatRelative } from '@/lib/format'
import { AppHeader } from '@/components/AppHeader'
import { Select, type SelectOption } from '@/components/Select'
import { CommentIcon, HeartIcon, ShareIcon } from '@/components/Icons'
import { useFavourites } from '@/lib/favourites'

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

  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      /*
       * Asks who is here, rather than being told.
       *
       * This used to fetch one creator named by VITE_DEFAULT_CREATOR. That
       * is not a listing, it is a guess — and when the guess went stale after
       * a handle change, `getCreator` returned null, this effect returned
       * early, and every section's `length > 0` guard failed. The result was
       * a blank white page with nothing to say what had happened.
       */
      const found = await adapter.listCreators()
      if (cancelled) return

      /*
       * One request per creator, which is fine at this size and will not be.
       * The moment the platform has more than a page of creators this wants
       * to be a single query returning the feed already assembled — the
       * adapter is the seam where that happens, and no screen changes.
       */
      const owned = await Promise.all(found.map((creator) => adapter.listProjects(creator.slug)))
      if (cancelled) return

      setCreators(found)
      setProjects(owned.flat())
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const creatorBySlug = useMemo(() => new Map(creators.map((c) => [c.slug, c])), [creators])

  /*
   * Selected as two separate values, not as the whole store: subscribing to
   * the object would re-render the feed on any change to it, and picking the
   * Set alone leaves `toggle` reaching for a stale closure.
   */
  const favourites = useFavourites((s) => s.ids)
  const toggleFavourite = useFavourites((s) => s.toggle)

  /*
   * Which row just had its link copied, so the share glyph can turn into a
   * checkmark on the control itself. There is nowhere else in this app to
   * put a "copied" toast, and a confirmation that lands on the thing you
   * tapped needs no such place.
   */
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null)

  const shareContent = async (content: Content, project: Project) => {
    const path = projectPath(project.ownerSlug, project.slug, CONTENT_TYPE_SEGMENT[content.type])
    const url = new URL(path, window.location.origin).href
    const byline = creatorBySlug.get(project.ownerSlug)?.name
    const shareData: ShareData = {
      title: content.title,
      text: byline ? `${content.title} — ${byline} on bronze.fm` : content.title,
      url,
    }

    // The Share Sheet where the platform offers one — it hands the choice
    // of destination to the OS, which is the whole point on a phone. Absent
    // (most desktop browsers) or refused (`canShare` false for this data),
    // it falls back to the clipboard rather than doing nothing.
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // A person closing the sheet is not a failure worth falling back
        // from — it is the sheet doing its job.
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
    } catch {
      return
    }
    setJustCopiedId(content.id)
    window.setTimeout(
      () => setJustCopiedId((current) => (current === content.id ? null : current)),
      1600,
    )
  }

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

      {/*
        Something, rather than nothing.
        
        Every section below is guarded on having rows, so with no data at all
        the page rendered as blank white — which is what a stale creator slug
        produced, with no way to tell that from a broken build. An empty
        platform is a real state and it should look like one.
      */}
      {loaded && creators.length === 0 && (
        <div className="mx-auto max-w-[var(--app-w)] px-5 pt-10 sm:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/45">
            Nothing published yet
          </p>
          <p className="mt-3 text-sm leading-relaxed text-parchment/50">
            No creators have joined yet. This is where they will appear.
          </p>
        </div>
      )}

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
                  <span className="w-full font-sans text-[13px] font-medium leading-tight text-parchment/80">
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
              {/* "Feed" named the mechanism, not the thing: it told you how
                  the list was assembled rather than what was in it. These
                  rows are finished works — an album, a paper — so the
                  heading says what they are, in the same word the data model
                  uses for them. */}
              <h2 className="font-display text-lg font-semibold tracking-tight text-parchment">
                New Content
              </h2>

              {/* A single type has nothing to filter, so the control only
                  earns its place once there is a real choice to make. */}
              {availableTypes.length > 1 && (
                <Select
                  label="Filter by type"
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
                const creator = creatorBySlug.get(project.ownerSlug)
                return (
                  <motion.div
                    key={content.id}
                    data-testid="feed-row"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    // Negative inline margin plus matching padding: the tint
                    // on hover reaches the page margin, so it reads as the
                    // row lighting up rather than a floating band inset from
                    // the text it belongs to.
                    className="group relative -mx-2 flex items-center gap-3 px-2 py-3 text-left transition hover:bg-parchment/[0.04]"
                  >
                    {/*
                      The row opens the content; the heart is its own
                      control. Two actions in one row cannot both be the
                      row, and a <button> inside a <button> is not valid
                      HTML — browsers recover from it inconsistently and
                      assistive technology is told there is one control
                      where there are two.

                      So the row is a plain container and the navigation is
                      a button stretched behind everything in it. The
                      content above it is inert (`pointer-events-none`), so
                      a tap anywhere on the row reaches this; the heart
                      opts back in and sits above it.
                    */}
                    <button
                      onClick={() =>
                        navigate(
                          projectPath(
                            project.ownerSlug,
                            project.slug,
                            CONTENT_TYPE_SEGMENT[content.type],
                          ),
                        )
                      }
                      aria-label={content.title}
                      className="absolute inset-0"
                    />
                    {/*
                      Who made it, on the left, as a face over a handle.

                      The row used to open with the cover and carry the
                      creator as the first word of a grey meta line, which
                      put the least identifiable thing first: covers are
                      art, and art does not say whose it is. A face does.

                      Fixed width rather than intrinsic, so the titles beside
                      it all start at the same x — a ragged left edge down
                      the column is what you get when every row is as wide as
                      its own creator's handle.
                    */}
                    <span className="pointer-events-none flex w-14 shrink-0 flex-col items-center gap-1">
                      <img
                        src={
                          creator?.avatarUrl ?? artUrl(`${project.ownerSlug}-hero`, 'cover', 120)
                        }
                        alt=""
                        // The same accent ring the rail above and the profile
                        // use, at the weight that suits this size: `ring-2`
                        // at 36px reads as a border rather than a rim.
                        className="size-9 rounded-full object-cover ring-1 ring-ember/50"
                      />
                      <span className="w-full truncate text-center font-mono text-[10px] text-parchment/40">
                        @{project.ownerSlug}
                      </span>
                    </span>

                    <span className="pointer-events-none relative min-w-0 flex-1">
                      {/* Two lines before truncating. The creator moving out
                          of the meta line freed the room, and these titles
                          are long enough that one line ended mid-word on a
                          phone. */}
                      <span className="line-clamp-2 block text-sm leading-snug text-parchment">
                        {content.title}
                      </span>
                      {/* What it is and when — plain again. The three
                          controls tried living here and cost the date its
                          width: "Whitepaper · 4 days ago" was truncating
                          to "4 d…" the moment a third icon joined the
                          heart. A vertical rail keeps this line to what it
                          says, not what competes with it. */}
                      <span className="mt-1 block truncate font-mono text-[11px] text-parchment/40">
                        {CONTENT_TYPE_LABEL[content.type]}
                        {content.createdAt && <> · {formatRelative(content.createdAt)}</>}
                      </span>
                    </span>

                    {/*
                      Cover and controls as one column now, rather than
                      the cover alone with a rail beside it: the icons
                      moved from beside the art to underneath it, which is
                      what let the cover keep the width it already had
                      instead of costing the title a second column.

                      The row settles to whichever is taller — the cover
                      stack or the title block — and at this width that is
                      usually the title, which is most of the height this
                      traded back versus stacking the icons vertically.
                    */}
                    <span className="flex shrink-0 flex-col items-center gap-1">
                      <img
                        src={coverUrl(project, 200)}
                        alt=""
                        className="pointer-events-none size-14 shrink-0 object-cover"
                      />

                      {/*
                        `relative` is load-bearing, not decorative: the
                        stretched nav button is `position: absolute`, and
                        a positioned element paints above ordinary static
                        content in the SAME stacking context regardless
                        of DOM order — so a plain `pointer-events-auto`
                        span here is not enough, the nav button still
                        wins hit-testing and swallows every tap. Making
                        this span positioned too lifts it into the same
                        paint tier, where DOM order (it comes after the
                        nav button) decides, and it wins.

                        No counts under any of these, unlike the usual
                        shape for a control row like this. Every number
                        here would be fabricated — there is no account
                        system yet counting favourites or comments — and
                        an invented "1.2k" is worse than no number at
                        all.
                      */}
                      <span className="pointer-events-auto relative flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => toggleFavourite(content.id)}
                          aria-pressed={favourites.has(content.id)}
                          aria-label={
                            favourites.has(content.id)
                              ? `Remove ${content.title} from favourites`
                              : `Add ${content.title} to favourites`
                          }
                          className={`-m-1 shrink-0 p-1 transition ${
                            favourites.has(content.id)
                              ? 'text-heart'
                              : 'text-parchment/30 hover:text-parchment/55'
                          }`}
                        >
                          <HeartIcon className="size-3.5" filled={favourites.has(content.id)} />
                        </button>

                        {/* Comments are a placeholder — there is nowhere
                            yet for one to go, since the app has no
                            accounts to write them as. `aria-disabled`
                            says so to assistive technology rather than
                            leaving a control that visibly does nothing
                            when pressed. */}
                        <button
                          aria-disabled="true"
                          aria-label={`Comments on ${content.title} — coming soon`}
                          onClick={(e) => e.preventDefault()}
                          className="-m-1 shrink-0 cursor-default p-1 text-parchment/30"
                        >
                          <CommentIcon className="size-3.5" />
                        </button>

                        <button
                          onClick={() => shareContent(content, project)}
                          aria-label={`Share ${content.title}`}
                          className={`-m-1 shrink-0 p-1 transition ${
                            justCopiedId === content.id
                              ? 'text-ember'
                              : 'text-parchment/30 hover:text-parchment/55'
                          }`}
                        >
                          <ShareIcon className="size-3.5" done={justCopiedId === content.id} />
                        </button>
                      </span>
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
