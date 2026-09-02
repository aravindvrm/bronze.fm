import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import { CONTENT_TYPE_SEGMENT, type Content } from '@/content/types'
import { countWords } from '@/content/blocks'
import { creatorPath, projectPath } from '@/lib/tenant'
import { coverUrl, headerBackgroundUrl } from '@/lib/cover'
import { artUrl } from '@/lib/art'
import { formatTotal } from '@/lib/format'
import { AppHeader } from '@/components/AppHeader'
import { MusicIcon, ReadIcon, VideosIcon } from '@/components/Icons'

/**
 * One Project and the ways into it — `/@deanMaye/bronze`.
 *
 * The interfaces listed are whatever Contents the Project actually holds, not
 * a fixed set of tiles. Bronze shows one (music); Atonomos shows its
 * whitepaper. A Project with nothing in it says so rather than rendering an
 * empty grid.
 */
const INTERFACE = {
  music: { label: 'Music', Icon: MusicIcon, blurb: 'Listen to the record' },
  video: { label: 'Video', Icon: VideosIcon, blurb: 'Watch' },
  ereader: { label: 'Read', Icon: ReadIcon, blurb: 'Read the paper' },
} as const

/** What a Content is worth saying about itself on its tile. */
function subtitle(content: Content): string {
  if (content.type === 'music') {
    return content.items.length
      ? `${content.items.length} tracks · ${formatTotal(content.totalDurationMs)}`
      : 'Coming soon'
  }
  if (content.type === 'ereader') {
    // Prefer the carried count: fixture content deliberately arrives without
    // its body (see the adapter), while Supabase content brings the body and
    // no count. Either path yields a read time.
    // Counted by the shared helper rather than here: this used to pick fields
    // off the block union inline, which meant every kind added to the model
    // was silently worth zero words.
    const words = content.wordCount ?? countWords(content.document ?? [])
    // ~230wpm is the usual silent-reading estimate for prose of this register.
    return words ? `${Math.max(1, Math.round(words / 230))} min read` : 'Coming soon'
  }
  return content.items.length ? '' : 'Coming soon'
}

export function ProjectHub() {
  const navigate = useNavigate()
  const creator = useCreator()
  const project = useProject()
  const headerBg = headerBackgroundUrl(project.slug)

  return (
    <div className="min-h-full">
      {/* The hero below already sets the project's title, at the size it
          deserves — the bar was printing it a second time in miniature. */}
      <AppHeader backTo={creatorPath(creator.slug)} />

      {/*
        A full-bleed band, by the same construction the feed uses for its
        creators row: outside the content column so it reaches both edges,
        with its own column within, and flush to the header so no stripe of
        page shows between them.

        On the Project's own art where it has some — Bronze's back cover —
        and on flat `ink` where it does not, which is every other Project
        today. The band was the flat colour first; the art is the same idea
        with something to say.
      */}
      <section className={`relative ${headerBg ? '' : 'bg-ink'}`}>
        {headerBg && (
          <>
            <img
              src={headerBg}
              alt=""
              data-testid="header-art"
              className="absolute inset-0 size-full object-cover"
            />
            {/*
              A heavy scrim, and measured rather than eyeballed. This art is
              near-black across half its area but carries candle flames and a
              city window that reach the top of the range — sampled, its
              brightest thousandth sits at 0.58 relative luminance. `object-
              cover` crops differently at every width, so there is no
              knowing which part lands behind the text: the floor has to
              hold anywhere, not on average. 70% is where white clears
              4.5:1 against that worst case, so the gradient never goes
              lighter than that, only heavier towards the foot.
            */}
            <div className="absolute inset-0 bg-gradient-to-t from-scrim/90 via-scrim/80 to-scrim/70" />
          </>
        )}
        <div className="relative mx-auto max-w-[var(--app-w)] px-5 pb-4 pt-3 sm:px-8 sm:pb-6 sm:pt-5">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center"
          >
            <div className="min-w-0 flex-1">
              {/*
              Whose project this is, with a face on it.

              Sized against the title rather than in isolation. The title was
              48px to the name's 10 — nearly five to one, which read as a
              caption stuck to a billboard rather than as an attribution. 36
              to 12 is three to one: the title still leads, the creator is
              still legible as the smaller thing, and neither is shouting.

              The tracking came down with it. 0.4em is spacing for type at
              10px; at 12 it pulls the word apart.

              A link as well as a label. The creator's name was already here
              as plain text, which named the owner while giving no way to
              reach them — the only route back to the profile was the
              header's back arrow, and that goes wherever you came FROM
              rather than to whoever made this.

              Same avatar and same accent ring as the featured rail and the
              profile itself, including the fallback, so a creator looks like
              themselves everywhere. `ring-1` rather than the rail's `ring-2`
              because this is a quarter of the size and a two-pixel ring at
              24px reads as a border.
            */}
              <button
                onClick={() => navigate(creatorPath(creator.slug))}
                aria-label={`${creator.name} — creator profile`}
                className="group flex items-center gap-2.5"
              >
                <img
                  src={creator.avatarUrl ?? artUrl(`${creator.slug}-hero`, 'cover', 120)}
                  alt=""
                  className="size-8 shrink-0 rounded-full object-cover ring-1 ring-ember/50"
                />
                {/*
                  Ember everywhere else, white on the art. The accent is a
                  mid-tone bronze: sampled against this photo's brightest
                  areas it manages 1.9:1 and under, which is not a contrast
                  so much as an absence. The ring above keeps the accent —
                  it is a shape, not something anyone has to read.
                */}
                <span
                  className={`text-xs uppercase tracking-[0.22em] transition ${
                    headerBg
                      ? 'text-on-media group-hover:text-on-media/80'
                      : 'text-ember/70 group-hover:text-ember'
                  }`}
                >
                  {creator.name}
                </span>
              </button>
              <h1
                className={`mt-2.5 text-4xl leading-[1.08] tracking-tight sm:text-6xl ${
                  headerBg ? 'text-on-media' : 'text-parchment'
                }`}
              >
                {project.title}
              </h1>
              {project.description && (
                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    headerBg ? 'text-on-media/85' : 'text-parchment/50'
                  }`}
                >
                  {project.description}
                </p>
              )}
            </div>
          </motion.header>
        </div>
      </section>

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        {project.contents.length === 0 ? (
          <p className="mt-10 text-sm text-parchment/40">Nothing published in this project yet.</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-5">
            {project.contents.map((content, i) => {
              const meta = INTERFACE[content.type]
              const sub = subtitle(content)
              return (
                <motion.button
                  key={content.id}
                  onClick={() =>
                    navigate(
                      projectPath(creator.slug, project.slug, CONTENT_TYPE_SEGMENT[content.type]),
                    )
                  }
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
                  <div className="absolute inset-0 bg-gradient-to-t from-scrim/85 from-0% via-scrim/45 via-32% to-scrim/10 to-70%" />
                  <meta.Icon className="absolute left-4 top-4 size-7 text-ember drop-shadow-[0_1px_6px_var(--color-shade)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block font-display text-xl text-on-media">{meta.label}</span>
                    {sub && (
                      <span className="mt-0.5 block text-[11px] text-on-media/70">{sub}</span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
