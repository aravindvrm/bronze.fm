import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Serves the local master audio at /media/audio/* during development.
 *
 * `apply: 'serve'` is load-bearing: this runs in dev only, so the masters can
 * never be copied into a build. They previously lived as a symlink under
 * public/, which meant `vite build` copied 66 MB of unreleased audio into
 * dist/ — deploying that would have published the album as plain files.
 *
 * Range is implemented properly here because <audio> depends on it, and it
 * gives the service worker's 206 reconstruction a realistic target in dev.
 */
function localMedia(): Plugin {
  const dir = path.resolve(__dirname, 'Bronze')
  return {
    name: 'bronze-local-media',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/media/audio', (req, res, next) => {
        try {
          const rel = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '')
          // Contain to the media directory — no traversal out of it.
          const file = path.join(dir, rel)
          if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            return next()
          }

          const size = fs.statSync(file).size
          const range = req.headers.range
          const type = file.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream'

          if (range) {
            const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim())
            if (m) {
              const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1])
              const end = m[2] === '' || m[1] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
              if (start <= end && start < size) {
                res.writeHead(206, {
                  'Content-Type': type,
                  'Content-Length': end - start + 1,
                  'Content-Range': `bytes ${start}-${end}/${size}`,
                  'Accept-Ranges': 'bytes',
                })
                return fs.createReadStream(file, { start, end }).pipe(res)
              }
            }
          }

          res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' })
          fs.createReadStream(file).pipe(res)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localMedia(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      injectManifest: {
        // Shell only. Media is cached deliberately at runtime, never precached.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        globIgnores: ['**/media/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'bronze.fm',
        short_name: 'bronze.fm',
        description: 'Music, video, merch and live events from the artists themselves.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0705',
        theme_color: '#0a0705',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Off by default: a live worker in dev shadows HMR and serves stale
      // modules. PWA_DEV=true turns it on so the caching path can be exercised
      // against the dev media middleware — that is how the e2e suite verifies
      // the 206 reconstruction end to end.
      devOptions: {
        enabled: process.env.PWA_DEV === 'true',
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
})
