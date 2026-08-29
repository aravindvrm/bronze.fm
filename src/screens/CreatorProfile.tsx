import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { usePlayer } from '@/audio/playerStore'
import { useCreator } from '@/content/CreatorContext'
import { CONTENT_TYPE_LABEL, CONTENT_TYPE_SEGMENT, type Pin, type Project } from '@/content/types'
import { creatorPath, isDedicatedHost, projectPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import { AppHeader } from '@/components/AppHeader'
import { StubTiles } from '@/components/StubTiles'
import {
  InstagramIcon,
  LinkedInIcon,
  PlayIcon,
  ReadIcon,
  SpotifyIcon,
  XIcon,
} from '@/components/Icons'

/**
 * Fixed order, so the row does not reshuffle as platforms are connected.
 *
 * A platform with no URL in `creator.socials` renders dimmed rather than
 * being dropped — the same "not yet" register as the SOON tags on the tiles
 * below. Hiding it would read as an oversight; linking a guessed handle would
 * point at someone else's account.
 */
const SOCIALS = [
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon },
  { key: 'x', label: 'X', Icon: XIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'spotify', label: 'Spotify', Icon: SpotifyIcon },
] as const

/**
 * The Creator's profile — `/@dean`.
 *
 * Projects lead, because they are the work. Store and Events are Creator-wide
 * sections and sit below as stubs (PLAN.md §8.2); there is no Content tile,
 * since Projects replaced that listing entirely.
 */
const TABS = [
  { id: 'pinned', label: 'Pinned' },
  { id: 'projects', label: 'Projects' },
  { id: 'store', label: 'Store' },
  { id: 'events', label: 'Events' },
] as const

type TabId = (typeof TABS)[number]['id']

export function CreatorProfile() {
  const navigate = useNavigate()
  const creator = useCreator()
  const playFrom = usePlayer((s) => s.playFrom)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [tab, setTab] = useState<TabId>('pinned')
  // Set once, when pins land, and only while the visitor has not chosen a
  // tab themselves — otherwise the load would yank them off a tab they
  // just picked.
  const tabChosen = useRef(false)

  const bioRef = useRef<HTMLParagraphElement>(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [bioOverflows, setBioOverflows] = useState(false)

  /*
   * Only offer the toggle when the bio is actually clipped — a short one
   * would otherwise get a "More" that reveals nothing.
   *
   * Measured only while collapsed: an expanded element's scrollHeight equals
   * its clientHeight, so measuring then would report "fits", hide the
   * control, and strand the reader with no way back. `bioOverflows` is
   * therefore never cleared by the expanded state, only recomputed when
   * collapsed — including on resize, since the clamp is by line count and a
   * width change alters where it lands.
   */
  useEffect(() => {
    const el = bioRef.current
    if (!el || bioExpanded) return
    const measure = () => setBioOverflows(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [creator.bio, bioExpanded])

  useEffect(() => {
    let cancelled = false
    void adapter.listProjects(creator.slug).then((r) => {
      if (!cancelled) setProjects(r)
    })
    void adapter.listPins(creator.slug).then((r) => {
      if (cancelled) return
      setPins(r)
      // Pinned leads when there is curation to show; a Creator with none
      // opens on their catalogue rather than on an empty panel.
      if (!tabChosen.current && r.length === 0) setTab('projects')
    })
    return () => {
      cancelled = true
    }
  }, [creator.slug])

  /*
   * A pinned track plays; a pinned work opens. Playing needs the whole
   * Content, because the queue is the album — starting a track without its
   * siblings would leave nothing to advance to.
   */
  async function openPin(pin: Pin) {
    if (pin.itemIndex === undefined) {
      navigate(projectPath(creator.slug, pin.projectSlug, CONTENT_TYPE_SEGMENT[pin.contentType]))
      return
    }
    const content = await adapter.getContent(creator.slug, pin.projectSlug, pin.contentType)
    if (content) playFrom(content, pin.itemIndex)
  }

  /*
   * On a dedicated host (dean.bronze.fm) this profile IS the root: there is
   * no feed above it, so Back would point at a page that does not exist on
   * that host. The header falls back to the menu on the left there.
   */
  /*
   * No `overflow-hidden` here. It was clipping the blurred cover wash this
   * screen used to run behind its content, and that wash is long gone — but
   * an ancestor that clips overflow also becomes the containing block for
   * `position: sticky`, so it was quietly stopping the header from sticking
   * on this screen while it stuck everywhere else.
   */
  return (
    <div className="relative min-h-full">
      <AppHeader backTo={isDedicatedHost() ? undefined : '/'} />

      <div
        className="relative mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingTop: '2rem', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {/*
          Identity runs down the centre now: avatar, then name, then bio.
          The old layout hung a left-aligned avatar over a bordered card;
          this drops the card entirely, which is what lets the name sit as
          the largest thing on the screen without competing with a panel
          edge around it.

          The identity block is a row: avatar and name in a column, the
          social links stacked beside them. Four stacked icons come out
          within a few pixels of the avatar-plus-name height, so the two
          columns read as one object rather than a badge tacked on.

          The bio below stays left-aligned on the content margin, so its
          ragged right doesn't fight the rest of the page.
        */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/*
            Three columns: an empty spacer, the identity, then the links.
            The two flanking columns are `flex-1`, so they take an equal
            share and the avatar and name stay dead-centre on the page
            rather than being pushed off it by the links' width. The links
            then sit against the content's right margin — which is the same
            edge the header's menu button lands on, so they read as one
            vertical line down the right of the screen.
          */}
          <div className="flex w-full items-center">
            <div className="flex-1" aria-hidden />

            <div className="flex min-w-0 flex-col items-center">
              <img
                src={creator.avatarUrl ?? artUrl(`${creator.slug}-hero`, 'cover', 300)}
                alt=""
                className="size-28 rounded-full object-cover sm:size-32"
              />

              {/* The largest thing on the screen, because the page is about
                  this person. Hierarchy comes from size and weight now that
                  there is one face rather than a separate one for titles. */}
              <h1 className="mt-5 text-center font-display text-4xl font-bold tracking-[-0.03em] text-parchment sm:text-5xl">
                {creator.name}
              </h1>
            </div>

            <div className="flex flex-1 shrink-0 flex-col items-end gap-2.5">
              {SOCIALS.map(({ key, label, Icon }) => {
                const href = creator.socials?.[key]
                return href ? (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    // noreferrer as well as noopener: the target should not
                    // learn which profile the visitor came from.
                    rel="noopener noreferrer"
                    title={label}
                    aria-label={`${creator.name} on ${label}`}
                    className="grid size-9 place-items-center rounded-full border border-gilt/40 text-gilt transition hover:border-gilt hover:bg-gilt/10"
                  >
                    <Icon className="size-4" />
                  </a>
                ) : (
                  <span
                    key={key}
                    title={`${label} — not connected yet`}
                    className="grid size-9 place-items-center rounded-full border border-parchment/20 text-parchment/40"
                  >
                    <Icon className="size-4" />
                  </span>
                )
              })}
            </div>
          </div>

          {/*
            `max-w-prose` keeps the bio at a readable measure on a wide
            screen; on a phone it exceeds the viewport, so `w-full` governs
            and the block simply spans the column.
          */}
          {creator.bio && (
            <div className="mt-5 w-full max-w-prose text-left">
              <p
                ref={bioRef}
                className={`text-[15px] leading-relaxed text-parchment/60 ${
                  bioExpanded ? '' : 'line-clamp-3'
                }`}
              >
                {creator.bio}
              </p>
              {bioOverflows && (
                <button
                  onClick={() => setBioExpanded((open) => !open)}
                  aria-expanded={bioExpanded}
                  className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gilt/80 transition hover:text-gilt"
                >
                  {bioExpanded ? 'Less' : 'More'}
                </button>
              )}
            </div>
          )}
        </motion.header>

        {/*
          Tabs, not stacked sections. Pinned is a Creator's curation and
          Projects is their catalogue — two views of the same body of work
          rather than a sequence, so they sit side by side and only one is
          on screen at a time.

          Pinned leads when it has anything in it, for the reason it used to
          lead the page: it is what the Creator chose to put first. A Creator
          with no pins opens on Projects instead of a tab that would render
          an empty panel.
        */}
        {/*
          Scrollable rather than wrapped: four tabs overflow a narrow phone,
          and a tab strip that wraps to two lines stops reading as one
          control. `justify-center` only engages once they all fit, so the
          row is centred on a wide screen and flush-left when it scrolls.
        */}
        <div className="mt-9 flex justify-start gap-7 overflow-x-auto border-b border-parchment/15 no-scrollbar sm:justify-center sm:gap-8">
          {TABS.map(({ id, label }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => {
                  tabChosen.current = true
                  setTab(id)
                }}
                role="tab"
                aria-selected={active}
                className={`-mb-px shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                  active
                    ? 'border-gilt text-gilt'
                    : 'border-transparent text-parchment/40 hover:text-parchment/70'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* The tab above names the section, so the panel carries no heading
            of its own. An empty state is spelled out rather than left blank:
            a tab that opens onto nothing reads as broken. */}
        {tab === 'pinned' && (
          <section className="mt-6" data-testid="panel-pinned">
            {pins.length === 0 && (
              <p className="text-sm text-parchment/40">Nothing pinned yet.</p>
            )}
            <div className="flex flex-col gap-2.5">
              {pins.map((pin, i) => (
                <motion.button
                  key={pin.id}
                  onClick={() => void openPin(pin)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-3 border border-parchment/25 bg-ink/40 p-2.5 text-left backdrop-blur-sm transition hover:border-parchment/25"
                >
                  <img
                    src={pin.hash ? artUrl(pin.hash, 'item', 128) : artUrl(`${pin.projectSlug}-cover`, 'cover', 128)}
                    alt=""
                    className="size-12 shrink-0 object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-parchment">
                      {pin.title}
                    </span>
                    {pin.subtitle && (
                      <span className="block truncate text-[11px] text-parchment/40">
                        {pin.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 pr-1 text-gilt/70">
                    {pin.itemIndex === undefined ? (
                      <ReadIcon className="size-5" />
                    ) : (
                      <PlayIcon className="size-5" />
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {tab === 'projects' && (
          <section className="mt-6" data-testid="panel-projects">
            {projects?.length === 0 ? (
              <p className="text-sm text-parchment/40">No projects yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-5">
                {(projects ?? []).map((project, i) => (
                  <motion.button
                    key={project.id}
                    onClick={() => navigate(creatorPath(creator.slug, project.slug))}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 + i * 0.09, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative aspect-square overflow-hidden border border-parchment/25 text-left"
                  >
                    <img
                      src={coverUrl(project, 600)}
                      alt=""
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 from-0% via-black/45 via-32% to-transparent to-60%" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <span className="block truncate text-xl text-white">
                        {project.title}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-white/70">
                        {project.contents.length
                          ? project.contents.map((c) => CONTENT_TYPE_LABEL[c.type]).join(' · ')
                          : 'Coming soon'}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Creator-level and stubs for now (PLAN.md §8.2). They are tabs
            rather than a grid below the others so reaching them never
            depends on how long the Pinned or Projects lists happen to be —
            the same tap from anywhere. The grid itself is shared with the
            standalone /@dean/store and /@dean/events routes. */}
        {tab === 'store' && (
          <section className="mt-6" data-testid="panel-store">
            <StubTiles kind="store" emptyLabel={`${creator.name} has nothing here yet.`} />
          </section>
        )}

        {tab === 'events' && (
          <section className="mt-6" data-testid="panel-events">
            <StubTiles kind="event" emptyLabel={`${creator.name} has nothing here yet.`} />
          </section>
        )}
      </div>
    </div>
  )
}
