import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs', 'tests/**/*.test.ts', '*.test.ts'],
    // Playwright specs live under e2e/ and are driven by Playwright, not Vitest.
    // `._*` excludes macOS AppleDouble sidecars: this repo lives on an ExFAT
    // volume with no native xattr support, so the OS writes a binary companion
    // for every file — and they match the test glob.
    exclude: ['e2e/**', 'node_modules/**', '**/._*'],
    restoreMocks: true,
  },
})
