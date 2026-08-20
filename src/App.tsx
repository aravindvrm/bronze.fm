import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AudioProvider } from '@/audio/AudioProvider'
import { usePlayer } from '@/audio/playerStore'
import { content } from '@/content/adapter'
import { MiniPlayer } from '@/components/MiniPlayer'
import { PlayerScreen } from '@/components/PlayerScreen'
import { Splash } from '@/screens/Splash'
import { Home } from '@/screens/Home'
import { Music } from '@/screens/Music'
import { StubGrid } from '@/screens/StubGrid'

export default function App() {
  const location = useLocation()
  const loadRelease = usePlayer((s) => s.loadRelease)
  const expanded = usePlayer((s) => s.expanded)

  useEffect(() => {
    void content.getRelease().then(loadRelease)
  }, [loadRelease])

  const onSplash = location.pathname === '/'

  return (
    <AudioProvider>
      {/*
        Routes live inside AudioProvider, and the audio element itself lives
        outside React entirely — so navigation never interrupts playback.
      */}
      <div className="h-full overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Splash />} />
            <Route path="/home" element={<Home />} />
            <Route path="/music" element={<Music />} />
            <Route
              path="/videos"
              element={
                <StubGrid
                  kind="video"
                  title="Videos"
                  blurb="Official videos, visualisers and studio footage will land here."
                />
              }
            />
            <Route
              path="/merch"
              element={<StubGrid kind="merch" title="Merch" blurb="Apparel, vinyl and prints. Checkout arrives with the release." />}
            />
            <Route
              path="/events"
              element={<StubGrid kind="event" title="Events" blurb="Live dates and ticket links, announced as they are confirmed." />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>

      {/* Both persist across route changes — one player, two presentations. */}
      <AnimatePresence>{!onSplash && !expanded && <MiniPlayer key="mini" />}</AnimatePresence>
      <AnimatePresence>{expanded && <PlayerScreen key="full" />}</AnimatePresence>
    </AudioProvider>
  )
}
