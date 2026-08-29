import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

/**
 * The manifest's colours, read from the theme block rather than restated.
 *
 * They were pinned to #0b0b0b — the background of a dark palette the app no
 * longer uses — so Android drew a black launch splash before opening a white
 * app, and the browser chrome was tinted for a theme that had been replaced.
 * Reading them here means a palette change carries the installed app with it.
 */
function themeColour(name: string): string {
  const css = fs.readFileSync(path.resolve(__dirname, 'src/index.css'), 'utf8')
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`))
  if (!m) throw new Error(`--color-${name} missing or not a hex in src/index.css`)
  return m[1]
}

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

/**
 * Keeps <meta name="theme-color"> on the palette.
 *
 * The tag is read before any stylesheet, so it cannot use a CSS variable and
 * has to carry a literal — which is exactly the kind of value that silently
 * outlives a retheme. Rewriting it at build time from the same token the app
 * uses means the one in index.html is only a placeholder, and a stale one
 * cannot ship.
 */
function themeColorMeta(): Plugin {
  return {
    name: 'bronze-theme-color',
    transformIndexHtml(html) {
      return html.replace(
        /(<meta name="theme-color" content=")[^"]*(")/,
        `$1${themeColour('void')}$2`,
      )
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    themeColorMeta(),
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
        // jpg is here for cover art, which is shell rather than media: the
        // splash is the entry screen, so a cold offline start without it opens
        // on a broken image. Bundled covers are content-hashed, so a replaced
        // cover revokes the old precache entry rather than shadowing it.
        //
        // Icons handled explicitly rather than by extension: vite-plugin-pwa
        // already adds every manifest.icons entry below to the precache list
        // on its own. A bare `png` in globPatterns matches those same files a
        // second time — the only .png files this build produces are the four
        // under icons/ — and a duplicate URL makes the SW's Cache.addAll()
        // throw during install, which silently discards the *whole*
        // registration, not just the icon entry. apple-touch-icon.png isn't
        // in manifest.icons, so it's the one icon still worth listing here.
        globPatterns: ['**/*.{js,css,html,jpg,svg,woff2}', 'icons/apple-touch-icon.png'],
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
        background_color: themeColour('void'),
        theme_color: themeColour('void'),
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
  server: {
    port: 5173,
    // Bound to loopback by default, deliberately. The dev middleware serves the
    // unreleased masters at /media/audio, so `--host` without thought exposes
    // the album to every device on whatever network this laptop is joined to.
    //
    //   npm run dev             loopback only — tests and CI
    //   npm run dev:tailscale   the tailnet address only, for a phone
    //   npm run dev:usb         v4 loopback + service worker, for `adb reverse`
    //
    // Never expose this through a public tunnel (ngrok, cloudflared): it would
    // put the unreleased masters on the open internet.
    allowedHosts: ['.ts.net'],
  },
})
