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
import { Splash } from '@/screens/Splash'
import { Home } from '@/screens/Home'
import { Music } from '@/screens/Music'
import { StubGrid } from '@/screens/StubGrid'

/**
 * Loads the Creator addressed by the current host or path, primes the player
 * with their primary music Content, then renders their namespace.
 */
function CreatorShell() {
  const params = useParams()
  const slug = params.creator ?? resolveCreatorSlug()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [missing, setMissing] = useState(false)
  const loadContent = usePlayer((s) => s.loadContent)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const c = await adapter.getCreator(slug)
      if (cancelled) return
      if (!c) return setMissing(true)
      setCreator(c)
      const music = await adapter.listContent(slug, 'music')
      if (!cancelled && music[0]) loadContent(music[0])
    })()
    return () => {
      cancelled = true
    }
  }, [slug, loadContent])

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
        <Route index element={<Splash />} />
        <Route path="home" element={<Home />} />
        <Route path="music" element={<Music />} />
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
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </CreatorProvider>
  )
}

export default function App() {
  const location = useLocation()
  const expanded = usePlayer((s) => s.expanded)

  // On a dedicated host the Creator comes from the hostname, so paths carry no
  // creator segment. On the shared host the first segment is the Creator.
  const dedicated = isDedicatedHost()

  const onSplash = dedicated
    ? location.pathname === '/'
    : location.pathname.split('/').filter(Boolean).length <= 1

  return (
    <AudioProvider>
      {/*
        No AnimatePresence around the routes. `mode="wait"` couples navigation
        to an exit animation completing — every nav stalls behind it, and an
        interrupted animation strands the user on the old screen. Without
        `mode="wait"` the outgoing and incoming screens stack in flow instead.
        Screens animate themselves on mount, which needs neither.
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

      {/* One player, two presentations — both persist across route changes. */}
      <AnimatePresence>{!onSplash && !expanded && <MiniPlayer key="mini" />}</AnimatePresence>
      <AnimatePresence>{expanded && <PlayerScreen key="full" />}</AnimatePresence>
    </AudioProvider>
  )
}
