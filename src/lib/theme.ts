import { create } from 'zustand'

/**
 * Light or dark, and nothing in between.
 *
 * Deliberately NOT following `prefers-color-scheme`. The app offers an
 * explicit switch, so the stored choice is the only source of truth — a
 * media query alongside it means two ways for the app to be dark and a class
 * of bug where the switch and the system disagree about which one won.
 *
 * The value is written to `data-theme` on <html>, which is what the CSS
 * hangs off. Applied a second time here on load even though index.html has
 * already done it before first paint: the inline script is what avoids the
 * flash, this is what makes the store agree with the document.
 */

export type Theme = 'light' | 'dark'

/** Shared with the inline script in index.html — change both together. */
export const THEME_KEY = 'bronze:theme'

export function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    // Private mode throws rather than returning null.
    return 'light'
  }
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  /*
   * The browser's own chrome — the address bar on Android, the status bar
   * in a standalone PWA — is coloured by this tag, and a white bar above a
   * black app is exactly the seam a dark theme exists to remove. Written
   * live rather than at build, because the build cannot know which theme a
   * given visitor chose.
   */
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute(
      'content',
      getComputedStyle(document.documentElement).getPropertyValue('--color-void').trim(),
    )
  }
}

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useTheme = create<ThemeStore>((set, get) => ({
  theme: typeof document === 'undefined' ? 'light' : storedTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Unremembered is survivable; unthemed is not.
    }
    apply(theme)
    set({ theme })
  },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))
