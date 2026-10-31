/** How far back, in characters, a finger must turn before a stroke starts undoing what it did. */
export const TURN = 4;

/** A finger drawn along a line on the practice pages, bringing words back or letting them go. */
export interface Sweep {
  line: number;
  /** Where the finger was last seen, and the furthest it got in the way it is going. */
  at: number;
  far: number;
  dir: -1 | 0 | 1;
  show: boolean;
}

/**
 * The stroke moved on to `at` on its line. The phone reports the finger only
 * every so often, so everything between the last place and this one is
 * passed over too. Turning back by more than a wobble undoes it: words
 * brought back are let go again, like a window opened and closed.
 */
export function sweepTo(sweep: Sweep, at: number): { next: Sweep; from: number; to: number; show: boolean } | undefined {
  const step = Math.sign(at - sweep.at) as -1 | 0 | 1;
  if (step === 0) return undefined;
  const span = (from: number, show: boolean, next: Sweep) => ({ next, from: Math.min(from, at), to: Math.max(from, at), show });
  if (sweep.dir === 0 || (at - sweep.far) * sweep.dir >= 0) {
    return span(sweep.at, sweep.show, { ...sweep, at, far: at, dir: sweep.dir || step });
  }
  if (Math.abs(sweep.far - at) < TURN) return { next: { ...sweep, at }, from: at, to: at - 1, show: sweep.show };
  const show = !sweep.show;
  return span(sweep.far, show, { ...sweep, at, far: at, dir: step, show });
}

/** The words a stroke passed over, by the offsets of their first letters. */
export function wordsWithin(words: readonly { start: number; end: number }[], from: number, to: number): number[] {
  return words.filter((w) => w.start <= to && w.end > from).map((w) => w.start);
}
