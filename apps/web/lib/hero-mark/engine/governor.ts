/**
 * The slow-device governor: it watches what forming frames cost and, when the p90 runs over
 * budget, first widens the cut's pitch, then skips to the settled plate (cut once at the full
 * pitch and cached). It never acts on settled frames, which are cheap.
 */
export type GovernorState = 'ok' | 'coarse' | 'skipped'

export interface Governor {
  readonly state: () => GovernorState
  /** How much wider than normal the pitch is cut. */
  readonly coarsen: () => number
  /** Records one forming frame's cost (ms); returns the new state when it changes. */
  record(ms: number): GovernorState | null
}

const p90 = (a: readonly number[]): number =>
  [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.9)] ?? 0

export function createGovernor(maxFrameMs: number): Governor {
  let state: GovernorState = 'ok'
  let frames = 0
  const costs: number[] = []
  return {
    state: () => state,
    coarsen: () => (state === 'coarse' ? 1.6 : 1),
    record(ms) {
      // the first frames pay for warm-up, not for the device
      if (state === 'skipped' || ++frames <= 4) return null
      costs.push(ms)
      if (costs.length < 12) return null
      const slow = p90(costs) > maxFrameMs
      costs.length = 0
      if (!slow) return null
      state = state === 'ok' ? 'coarse' : 'skipped'
      return state
    },
  }
}
