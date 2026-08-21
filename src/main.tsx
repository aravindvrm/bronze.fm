import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { requestPersistence } from '@/lib/mediaCache'

// `prompt` rather than auto-reload: a silent update mid-playback would tear
// down the audio element. The page keeps the old shell until it is reloaded.
registerSW({
  immediate: true,
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
