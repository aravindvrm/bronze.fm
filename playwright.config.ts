import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright runs a real browser, which is the point: the automated preview
 * used during development runs with `visibilityState: "hidden"`, so
 * requestAnimationFrame never fires and every Framer Motion animation freezes
 * at its `initial` value. Animation and gesture behaviour can only be checked
 * somewhere frames actually tick.
 */
export default defineConfig({
  testDir: './e2e',
  // Skips macOS AppleDouble sidecars: this repo lives on an ExFAT volume with
  // no native xattr support, so the OS writes a binary ._ companion for every
  // file — and they match the spec glob.
  testIgnore: ['**/._*'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        // Autoplay policy would otherwise block programmatic play() and every
        // playback assertion would fail for reasons unrelated to the app.
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
      },
    },
  ],
  webServer: {
    // PWA_DEV enables the service worker in dev so the caching path is real.
    command: 'PWA_DEV=true npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
