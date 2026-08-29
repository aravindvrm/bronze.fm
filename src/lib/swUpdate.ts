/**
 * A new build is waiting to take over.
 *
 * The registration lives in main.tsx, outside React, so this is the seam
 * between it and the banner that offers the reload. Deliberately a tiny
 * subscribe/snapshot pair rather than a store: there is exactly one boolean
 * and one callback here, and `useSyncExternalStore` consumes this shape
 * directly.
 */

let apply: (() => void) | null = null
let waiting = false
const listeners = new Set<() => void>()

/** Called by the registration when a new worker is installed and waiting. */
export function announceUpdate(applyFn: () => void) {
  apply = applyFn
  waiting = true
  for (const l of listeners) l()
}

export function subscribeUpdate(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updateWaiting() {
  return waiting
}

/**
 * Hands control to the waiting worker and reloads. The reload is the plugin's
 * own: it waits for `controllerchange` before navigating, so the page never
 * reloads into a half-swapped cache.
 */
export function applyUpdate() {
  apply?.()
}

/**
 * Dismiss without updating. The worker stays waiting and the offer returns on
 * the next cold open, which is the point of prompting rather than forcing:
 * someone mid-listen should not be interrupted by a version they did not ask
 * for.
 */
export function dismissUpdate() {
  waiting = false
  for (const l of listeners) l()
}
