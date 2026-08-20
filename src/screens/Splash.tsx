import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '@/audio/playerStore'
import { useCreator } from '@/content/CreatorContext'
import { creatorPath } from '@/lib/tenant'
import { artUrl } from '@/lib/art'

/**
 * Cover-art splash for the Creator's primary Content.
 *
 * Entry is tap-gated rather than timed, deliberately: the tap is the user
 * gesture browsers require before audio may play. Auto-advancing would mean
 * the first play attempt trips the autoplay policy and fails silently.
 */
export function Splash() {
  const navigate = useNavigate()
  const creator = useCreator()
  const content = usePlayer((s) => s.content)
  const cover = artUrl(`${content?.slug ?? 'bronze'}-cover`, 'cover', 1400)

  return (
    <motion.div
      onClick={() => navigate(creatorPath(creator.slug, 'home'))}
      className="grain relative h-full w-full cursor-pointer overflow-hidden bg-void"
    >
      <motion.img
        src={cover}
        alt={`${content?.title ?? ''} cover`}
        initial={{ scale: 1.18, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void/20 via-transparent to-void" />

      <div
        className="relative flex h-full flex-col items-center justify-end text-center"
        style={{ paddingBottom: 'calc(var(--safe-b) + 5rem)' }}
      >
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.9 }}
          className="text-[10px] uppercase tracking-[0.4em] text-gilt/70"
        >
          {creator.name}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 1 }}
          className="mt-3 font-display text-6xl tracking-tight text-parchment"
        >
          {content?.title ?? ''}
        </motion.h1>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.75, 0.35, 0.75] }}
          transition={{ delay: 1.5, duration: 3.2, repeat: Infinity, repeatType: 'reverse' }}
          className="mt-12 text-[10px] uppercase tracking-[0.3em] text-parchment/50"
        >
          Tap to enter
        </motion.span>
      </div>
    </motion.div>
  )
}
