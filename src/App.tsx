import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, useParams, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AudioProvider } from '@/audio/AudioProvider'
import { usePlayer } from '@/audio/playerStore'
import { content as adapter } from '@/content/adapter'
import { CreatorProvider } from '@/content/CreatorContext'
import type { Creator } from '@/content/types'
import { isDedicatedHost, resolveCreatorSlug } from '@/lib/tenant'
import { MiniPlayer } from '@/components/MiniPlayer'
import { PlayerScreen } from '@/components/PlayerScreen'
import { CreatorProfile } from '@/screens/CreatorProfile'
import { MusicIndex } from '@/screens/MusicIndex'
import { ContentDetail } from '@/screens/ContentDetail'
import { StubGrid } from '@/screens/StubGrid'

/**
 * Everything under one Creator.
 *
 *   /dean               the Creator's profile — the tenant root
 *   /dean/music         their releases
 *   /dean/videos|merch|events   Creator-scoped sections
 *   /dean/bronze        one Content
 *
 * Content sits flat alongside the sections, so section names are reserved and
 * cannot be used as Content slugs — enforced in the router by ordering and in
 * the database by a CHECK constraint.
 */
function CreatorShell() {
  const params = useParams()
  const slug = params.creator ?? resolveCreatorSlug()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMissing(false)
    void adapter.getCreator(slug).then((c) => {
      if (cancelled) return
      if (!c) setMissing(true)
      else setCreator(c)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (missing) {
    return (
      <div className="grid h-full place-items-center bg-void px-8 text-center">
        <p className="text-sm text-parchment/50">
          No creator called <span className="text-gilt">{slug}</span>.
        </p>
      </div>
    )
  }
  if (!creator) return <div className="h-full bg-void" />

  return (
    <CreatorProvider creator={creator}>
      <Routes>
        <Route index element={<CreatorProfile />} />
        <Route path="music" element={<MusicIndex />} />
        <Route
          path="videos"
          element={<StubGrid kind="video" title="Videos" blurb="Official videos, visualisers and studio footage will land here." />}
        />
        <Route
          path="merch"
          element={<StubGrid kind="merch" title="Merch" blurb="Apparel, vinyl and prints. Checkout arrives with the release." />}
        />
        <Route
          path="events"
          element={<StubGrid kind="event" title="Events" blurb="Live dates and ticket links, announced as they are confirmed." />}
        />
        {/* Last, so the reserved sections above always win the match. */}
        <Route path=":contentSlug" element={<ContentDetail />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </CreatorProvider>
  )
}

export default function App() {
  const location = useLocation()
  const expanded = usePlayer((s) => s.expanded)
  const hasQueue = usePlayer((s) => s.queue.length > 0)

  // On a dedicated host the Creator comes from the hostname, so paths carry no
  // creator segment. On the shared host the first segment is the Creator.
  const dedicated = isDedicatedHost()

  return (
    <AudioProvider>
      {/*
        No AnimatePresence around the routes. `mode="wait"` couples navigation
        to an exit animation completing — every nav stalls behind it, and an
        interrupted animation strands the user on the old screen. Screens
        animate themselves on mount, which needs neither.
      */}
      <div className="h-full overflow-y-auto no-scrollbar">
        <Routes location={location}>
          {dedicated ? (
            <Route path="/*" element={<CreatorShell />} />
          ) : (
            <>
              <Route path="/" element={<Navigate to={`/${resolveCreatorSlug()}`} replace />} />
              <Route path="/:creator/*" element={<CreatorShell />} />
            </>
          )}
        </Routes>
      </div>

      {/*
        One player, two presentations. The dock appears once something is
        queued rather than on particular routes — nothing is queued until a
        Content is actually played from.
      */}
      <AnimatePresence>{hasQueue && !expanded && <MiniPlayer key="mini" />}</AnimatePresence>
      <AnimatePresence>{expanded && <PlayerScreen key="full" />}</AnimatePresence>
    </AudioProvider>
  )
}
