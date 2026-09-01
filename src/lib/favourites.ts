import { create } from 'zustand'

/**
 * Which items the reader has hearted, for this visit only.
 *
 * There are no accounts yet, so there is nowhere durable to put this: a
 * favourite belongs to a person, and the app does not know who anybody is.
 * Rather than pretend otherwise, this keeps them in memory and lets them go
 * on reload.
 *
 * It is a store rather than `useState` in the row for one reason: the feed
 * unmounts on every navigation. Held in the component, a heart would clear
 * itself the moment you opened something and came back, which looks exactly
 * like a bug in the toggle rather than like the absent backend it is.
 *
 * Deliberately NOT localStorage. That would survive reloads and so read as
 * saved — and the first thing a real implementation must do is move these
 * to an account, at which point anything already on the device is either
 * silently dropped or wrongly attributed to whoever signs in.
 */
interface FavouritesState {
  ids: ReadonlySet<string>
  toggle: (id: string) => void
}

export const useFavourites = create<FavouritesState>((set) => ({
  ids: new Set<string>(),
  toggle: (id) =>
    set((state) => {
      // A new Set per change: zustand compares by reference, and mutating
      // the existing one leaves every subscriber looking at an object that
      // never appears to have changed.
      const next = new Set(state.ids)
      if (!next.delete(id)) next.add(id)
      return { ids: next }
    }),
}))
