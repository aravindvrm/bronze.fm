import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { content as adapter } from '@/content/adapter'
import { usePlayer } from '@/audio/playerStore'
import { useCreator } from '@/content/CreatorContext'
import { CONTENT_TYPE_LABEL, CONTENT_TYPE_SEGMENT, type Pin, type Project } from '@/content/types'
import { creatorPath, projectPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'
import { coverUrl } from '@/lib/cover'
import {
  EventsIcon,
  InstagramIcon,
  LinkedInIcon,
  MerchIcon,
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
 * Projects lead, because they are the work. Merch and Events are Creator-wide
 * sections and sit below as stubs (PLAN.md §8.2); there is no Content tile,
 * since Projects replaced that listing entirely.
 */
const SECTIONS = [
  { seg: 'merch', label: 'Merch', Icon: MerchIcon },
  { seg: 'events', label: 'Events', Icon: EventsIcon },
] as const

export function CreatorProfile() {
  const navigate = useNavigate()
  const creator = useCreator()
  const playFrom = usePlayer((s) => s.playFrom)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [pins, setPins] = useState<Pin[]>([])

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
      if (!cancelled) setPins(r)
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

  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        className="relative mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingTop: 'calc(var(--safe-t) + 3.5rem)', paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {/* Avatar overlaps the panel below it — the identity block a profile
            page needs. Falls back to procedural art only for a Creator with
            no photo yet, same as before this existed. */}
        <motion.img
          src={creator.avatarUrl ?? artUrl(`${creator.slug}-hero`, 'cover', 300)}
          alt=""
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 size-24 rounded-full border-2 border-void object-cover shadow-[0_4px_20px_rgba(0,0,0,0.5)] sm:size-32"
        />

        {/* Glass panel over the ambient grid, giving the name and bio a
            readable surface without a solid card breaking the backdrop. */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="-mt-4 rounded-md border border-white/[0.14] bg-ink/50 px-5 pb-4 pt-8 backdrop-blur-xl"
        >
          {/* Creator names are identity, not a Content title, so they stay on
              the app face rather than the release's. */}
          <h1 className="font-display text-4xl tracking-tight text-parchment sm:text-6xl">{creator.name}</h1>
          {creator.bio && (
            <div className="mt-3">
              <p
                ref={bioRef}
                className={`text-sm leading-relaxed text-parchment/50 ${
                  bioExpanded ? '' : 'line-clamp-3'
                }`}
              >
                {creator.bio}
              </p>
              {bioOverflows && (
                <button
                  onClick={() => setBioExpanded((open) => !open)}
                  aria-expanded={bioExpanded}
                  className="mt-2 text-[10px] uppercase tracking-[0.15em] text-gilt/80 transition hover:text-gilt"
                >
                  {bioExpanded ? 'Less' : 'More'}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.08] pt-4">
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
                  className="grid size-9 place-items-center rounded-full border border-white/10 text-parchment/25"
                >
                  <Icon className="size-4" />
                </span>
              )
            })}
          </div>
        </motion.header>

        {/* Curation before catalogue: pins are what the Creator chose to put
            first, so they lead rather than sitting under the full project
            list. Hidden entirely when empty — an empty "Pinned" heading would
            advertise a feature rather than show work. */}
        {pins.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3.5 text-[10px] uppercase tracking-[0.25em] text-parchment/40">Pinned</h2>
            <div className="flex flex-col gap-2.5">
              {pins.map((pin, i) => (
                <motion.button
                  key={pin.id}
                  onClick={() => void openPin(pin)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-3 rounded-md border border-white/[0.14] bg-ink/40 p-2.5 text-left backdrop-blur-sm transition hover:border-white/25"
                >
                  <img
                    src={pin.hash ? artUrl(pin.hash, 'item', 128) : artUrl(`${pin.projectSlug}-cover`, 'cover', 128)}
                    alt=""
                    className="size-12 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-content text-sm text-parchment">
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

        <section className="mt-8">
          <h2 className="mb-3.5 text-[10px] uppercase tracking-[0.25em] text-parchment/40">Projects</h2>
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
                    <span className="mt-0.5 block text-[11px] text-parchment/50">
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

        {/* Creator-level, and stubs for now (PLAN.md §8.2). Kept visually
            quieter than Projects: they are secondary to the work itself. */}
        <section className="mt-10">
          <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
            {SECTIONS.map((tile, i) => (
              <motion.button
                key={tile.seg}
                onClick={() => navigate(creatorPath(creator.slug, tile.seg))}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.09, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 rounded-md border border-white/[0.14] bg-ink/40 px-4 py-3.5 text-left backdrop-blur-sm"
              >
                <tile.Icon className="size-5 shrink-0 text-gilt/80" />
                <span className="font-display text-base text-parchment">{tile.label}</span>
                <span className="ml-auto rounded-full border border-gilt/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-gilt/70">
                  Soon
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
