import { useEffect, useState } from 'react'

/**
 * True once the app's scroll container has moved off the top.
 *
 * Both headers use it to take a background only when there is content behind
 * them to separate from. A bar that is always filled — translucent or not —
 * flattens the ambient field beneath it into plain colour, because a backdrop
 * blur averages a sparse net of thin lines away entirely; the background then
 * looks like it stops at the header. A bar that is never filled lets scrolling
 * text run into its own icons. Grounding on demand is what satisfies both.
 *
 * Watches the app's scroll container rather than the window: the page scrolls
 * inside an `overflow-y-auto` div, so `window.scrollY` never changes.
 */
export function useScrolledPast(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('[data-app-scroll]')
    if (!scroller) return
    const onScroll = () => setScrolled(scroller.scrollTop > threshold)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrolled
}
