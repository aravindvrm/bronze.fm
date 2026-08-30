import { Component, type ReactNode } from 'react'

/**
 * Keeps one broken screen from being a broken app.
 *
 * React unmounts the entire tree when a render throws, and there is no way
 * back: client-side navigation cannot remount a root that no longer exists,
 * so every subsequent route change lands on the same blank page. That is not
 * a theoretical failure mode here — a single paragraph in an unexpected
 * shape did exactly this, and the symptom was not "the reader is broken" but
 * "the app is white and stays white".
 *
 * The fix for that particular bug is upstream, in normaliseBlocks. This is
 * the fix for the CLASS of bug: whatever a screen manages to throw, the
 * chrome around it survives and there is a way out.
 *
 * A class component because that is the only thing React offers here —
 * `componentDidCatch` has no hook equivalent, by design.
 *
 * Keyed by route by its parent, so moving to another screen clears the error
 * rather than carrying it: without that, a screen that failed once would
 * keep showing its failure everywhere, which is the behaviour being fixed.
 */
export class ScreenBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Logged, not swallowed. The screen recovers; the cause should still be
    // findable in a console or a session replay.
    console.error('[screen] render failed', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-4 px-5 py-16 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">
          This screen stopped
        </p>
        <h1 className="text-2xl leading-snug text-parchment">
          Something here didn’t load the way it should.
        </h1>
        <p className="text-sm leading-relaxed text-parchment/60">
          The rest of the app is fine — go back, or try this screen again.
        </p>
        <button
          onClick={() => {
            this.setState({ error: null })
            this.props.onReset?.()
          }}
          className="mt-2 bg-gilt px-4 py-2 text-sm text-on-accent transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    )
  }
}
