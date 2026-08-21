import { motion } from 'framer-motion'
import { useCreator } from '@/content/CreatorContext'

/**
 * The Creator's profile — the tenant root at `/dean`.
 *
 * A stub for now. Content lives one level down (`/dean/bronze`) and owns its
 * own sections, so this page is about the Creator: identity, and eventually
 * their releases, links and biography.
 */
export function CreatorProfile() {
  const creator = useCreator()

  return (
    <div className="grain relative min-h-full overflow-hidden bg-void">
      <div
        className="relative flex min-h-full flex-col items-center justify-center px-8 text-center"
        style={{ paddingTop: 'calc(var(--safe-t) + 2rem)', paddingBottom: 'calc(var(--safe-b) + 6rem)' }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-5xl tracking-tight text-parchment"
        >
          {creator.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-4 text-[10px] uppercase tracking-[0.3em] text-parchment/35"
        >
          Profile coming soon
        </motion.p>
      </div>
    </div>
  )
}
