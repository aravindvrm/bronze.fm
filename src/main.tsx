import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { requestPersistence } from '@/lib/mediaCache'
import { announceUpdate } from '@/lib/swUpdate'

/*
 * `prompt` rather than auto-reload: a silent update mid-playback would tear
 * down the audio element.
 *
 * That was already the config, but nothing implemented the prompt and the
 * worker called skipWaiting on install regardless — so a new build took over
 * unannounced, which is precisely what `prompt` exists to prevent. The
 * worker now waits, and `onNeedRefresh` surfaces the offer through
 * UpdateBanner. `updateSW(true)` hands over and reloads only when the
 * listener accepts.
 */
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => announceUpdate(() => void updateSW(true)),
  onRegisteredSW: (swUrl, reg) => console.log('[sw] registered', swUrl, reg),
  onRegisterError: (err) => console.error('[sw] registration failed', err),
})

// Best-effort exemption from routine eviction. iOS still evicts under storage
// pressure, so cached audio is never treated as guaranteed.
void requestPersistence()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
