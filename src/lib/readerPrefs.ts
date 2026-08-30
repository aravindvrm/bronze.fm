/**
 * What the reader remembers, per device.
 *
 * localStorage rather than the account, because there is no account yet —
 * Account is still a greyed stub in the drawer. That makes this per-device by
 * construction, which is worth knowing: the same paper opened on a phone and
 * a laptop keeps two independent positions.
 *
 * Every read is wrapped: Safari in private mode throws on `localStorage`
 * access rather than returning null, and a reader that refuses to open
 * because it could not recall a font size would be a poor trade.
 */

const POSITION_KEY = 'bronze:reader-position'
const SCALE_KEY = 'bronze:reader-scale'
const COACH_KEY = 'bronze:reader-coached'

/**
 * Type sizes, as multipliers on the reader's base measure.
 *
 * Four steps, not a slider: a slider invites fiddling with a value nobody can
 * name, and every change repaginates the whole paper. The default is index 1
 * rather than the smallest, so the control has somewhere to go in both
 * directions.
 *
 * The steps used to be 0.9 / 1 / 1.15 / 1.32 — about 15% apart, which read as
 * a lurch rather than an adjustment. ~11% still crosses the whole useful
 * range in three moves while letting a single step feel like a correction.
 */
export const SCALES = [0.9, 1, 1.11, 1.24] as const
export const DEFAULT_SCALE_INDEX = 1

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Full, or blocked. Losing a preference is not worth surfacing.
  }
}

export function loadScaleIndex(): number {
  // The null check is load-bearing: `Number(null)` is 0, which is a
  // perfectly valid index, so coercing first made "nothing stored" mean
  // "the smallest size" and the reader opened one step down from its own
  // default for everyone who had never touched the control.
  const stored = read(SCALE_KEY)
  if (stored === null) return DEFAULT_SCALE_INDEX
  const raw = Number(stored)
  return Number.isInteger(raw) && raw >= 0 && raw < SCALES.length ? raw : DEFAULT_SCALE_INDEX
}

export function saveScaleIndex(index: number): void {
  write(SCALE_KEY, String(index))
}

/**
 * Positions are stored as a BLOCK index, never a page number.
 *
 * A page number means nothing across a resize, a rotation or a type-size
 * change — the same paper is 55 pages on a phone and 21 on a laptop. The
 * block it was showing is stable, so that is what gets recorded, and the page
 * is recomputed from it after every repagination.
 */
type Positions = Record<string, number>

function loadAll(): Positions {
  const raw = read(POSITION_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Positions) : {}
  } catch {
    return {}
  }
}

export function loadPosition(contentId: string): number {
  const at = loadAll()[contentId]
  return Number.isInteger(at) && at >= 0 ? at : 0
}

export function savePosition(contentId: string, block: number): void {
  write(POSITION_KEY, JSON.stringify({ ...loadAll(), [contentId]: block }))
}

/**
 * Whether the gestures have been explained already.
 *
 * localStorage, not sessionStorage: this is a thing you learn once, not once
 * per visit. Shown again after clearing site data, which is the same as
 * arriving new.
 */
export function coachSeen(): boolean {
  return read(COACH_KEY) !== null
}

export function markCoached(): void {
  write(COACH_KEY, '1')
}
