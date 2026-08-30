import { create } from 'zustand'

/**
 * Whether the app's persistent chrome should stand aside.
 *
 * One flag, set by whichever screen is asking for the reader's undivided
 * attention and read by the chrome that floats above every screen — today
 * the reader and the docked mini player. It exists because those two live in
 * different trees: the player is mounted at the App root so playback survives
 * navigation, so the reader cannot hide it by rendering anything.
 *
 * Not part of the player's own store. Pausing is player state; whether a
 * screen wants the room is not, and putting it there would mean every
 * playback concern grows a reason to care about reading.
 *
 * The screen that raises it must lower it on the way out — a flag left set
 * would hide the player everywhere.
 */
interface Immersion {
  immersed: boolean
  setImmersed: (immersed: boolean) => void
}

export const useImmersion = create<Immersion>((set) => ({
  immersed: false,
  setImmersed: (immersed) => set({ immersed }),
}))
