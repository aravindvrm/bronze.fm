import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The palette has to stay changeable from one place.
 *
 * Every colour this app draws lives in the `@theme` block in index.css. That
 * only holds while components ask for colour by token — the moment one
 * hard-codes `#c92c10` or reaches for Tailwind's built-in `black`/`white`,
 * that element stops following the theme, and a palette change leaves it
 * behind looking like a bug on one screen.
 *
 * These are cheap to write and expensive to notice by eye, so they are
 * asserted rather than trusted. Both have already happened in this codebase.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    // macOS AppleDouble sidecars are not UTF-8 and are not source.
    if (name.startsWith('._')) return []
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      // Generated content fixtures carry prose, not styling.
      return name === 'fixtures' ? [] : sourceFiles(full)
    }
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

/** Strips comments, so prose *about* a colour never trips the check. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const files = sourceFiles(SRC).filter((f) => !f.includes('__tests__'))

describe('theme integrity', () => {
  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(15)
  })

  /**
   * `art.ts` is the documented exception: it draws placeholder cover art as
   * a deliberately colourless greyscale ramp, standing in for photographs
   * rather than for app chrome. It is not themed on purpose.
   */
  it('never hard-codes a colour outside the theme block', () => {
    const offenders: string[] = []
    for (const file of files) {
      if (file.endsWith('/lib/art.ts')) continue
      for (const [i, line] of code(file).split('\n').entries()) {
        // A mask uses #000/#fff for its ALPHA channel only — it never
        // paints, so it is not a palette value. Identified by name, which is
        // why such constants are called `...Mask`.
        if (/mask/i.test(line)) continue
        const hit = line.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\([\d\s,.]+\)|\bhsla?\(/)
        if (hit) offenders.push(`${file.replace(SRC, 'src')}:${i + 1}  ${hit[0]}`)
      }
    }
    expect(
      offenders,
      `hard-coded colour(s) — add a token to index.css instead:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it("never uses Tailwind's built-in black or white", () => {
    const offenders: string[] = []
    for (const file of files) {
      for (const [i, line] of code(file).split('\n').entries()) {
        const hit = line.match(
          /\b(?:bg|text|border|from|via|to|ring|divide|shadow|fill|stroke|caret|accent)-(?:black|white)\b/,
        )
        if (hit) offenders.push(`${file.replace(SRC, 'src')}:${i + 1}  ${hit[0]}`)
      }
    }
    expect(
      offenders,
      `literal black/white — use --color-scrim / --color-on-media / --color-on-accent:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})

describe('theme tokens', () => {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8')
  const theme = css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {')))

  it('declares every colour the app asks for', () => {
    const declared = new Set([...theme.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1]))
    const used = new Set<string>()
    for (const file of files) {
      for (const m of code(file).matchAll(
        /\b(?:bg|text|border|from|via|to|ring|divide|fill|stroke|caret|accent)-([a-z][a-z-]*?)(?:\/\[?[\d.]+%?\]?)?(?=[\s"'`}])/g,
      )) {
        if (declared.has(m[1])) used.add(m[1])
      }
    }
    // Every token a component reaches for must exist; the reverse is checked
    // below so a retired token cannot linger.
    expect([...used].filter((t) => !declared.has(t))).toEqual([])
    expect(used.size).toBeGreaterThan(3)
  })

  it('carries no token nothing uses', () => {
    const declared = [...theme.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1])
    const body = files.map(code).join('\n') + css
    const unused = declared.filter((t) => {
      // A token referenced by another token (ambient -> gilt) counts as used.
      const inCss = new RegExp(`var\\(--color-${t}\\)`).test(css)
      const inTsx = new RegExp(`-${t}\\b`).test(body)
      return !inCss && !inTsx
    })
    expect(unused, `unused colour token(s) — delete them:\n${unused.join('\n')}`).toEqual([])
  })
})
