import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCreator } from '@/content/CreatorContext'
import { useProject } from '@/content/ProjectContext'
import { CONTENT_TYPE_SEGMENT, type Content } from '@/content/types'
import { creatorPath, projectPath } from '@/lib/tenant'
import { coverUrl } from '@/lib/cover'
import { formatTotal } from '@/lib/format'
import { ScreenHeader } from '@/components/ScreenHeader'
import { MusicIcon, ReadIcon, VideosIcon } from '@/components/Icons'

/**
 * One Project and the ways into it — `/@dean/bronze`.
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
    const words =
      content.wordCount ??
      (content.document ?? []).reduce(
        (n, b) => n + (b.kind === 'ul' ? b.items.join(' ') : b.text).split(/\s+/).length,
        0,
      )
    // ~230wpm is the usual silent-reading estimate for prose of this register.
    return words ? `${Math.max(1, Math.round(words / 230))} min read` : 'Coming soon'
  }
  return content.items.length ? '' : 'Coming soon'
}

export function ProjectHub() {
  const navigate = useNavigate()
  const creator = useCreator()
  const project = useProject()

  return (
    <div className="min-h-full">
      <ScreenHeader title={project.title} titleOf="content" to={creatorPath(creator.slug)} />

      <div
        className="mx-auto max-w-[var(--app-w)] px-5 sm:px-8"
        style={{ paddingBottom: 'calc(var(--safe-b) + 8rem)' }}
      >
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4 border border-parchment/25 p-4 sm:gap-8 sm:p-8"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gilt/70">{creator.name}</p>
            <h1 className="mt-2 text-5xl leading-[1.05] tracking-tight text-parchment sm:text-7xl">
              {project.title}
            </h1>
            {project.description && (
              <p className="mt-3 text-sm leading-relaxed text-parchment/50">{project.description}</p>
            )}
          </div>

          <img
            src={coverUrl(project, 400)}
            alt={`${project.title} cover`}
            className="size-24 shrink-0 self-center object-cover shadow-lg shadow-black/50 sm:size-44"
          />
        </motion.header>

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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 from-0% via-black/45 via-32% to-black/10 to-70%" />
                  <meta.Icon className="absolute left-4 top-4 size-7 text-gilt drop-shadow-[0_1px_6px_rgba(10,7,5,0.9)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block font-display text-xl text-white">{meta.label}</span>
                    {sub && <span className="mt-0.5 block text-[11px] text-white/70">{sub}</span>}
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
