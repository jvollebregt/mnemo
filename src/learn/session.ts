/**
 * The order of practice through a poem. Stanzas that are due come back
 * first, starting from the reader's marks, never from rereading. Then the
 * next new stanza goes through the whole method. From the second stanza on,
 * the join with the stanza before is practised by itself, since that is
 * where recitals usually break, and then all the stanzas so far are recited
 * together.
 */
import { dueStanzas, firstNewStanza, type Cards } from './schedule';
import type { Stage } from './stages';

export type Step =
  /** One stanza, from reading it to the check; or, when it comes back for review, from its marks. */
  | { kind: 'stanza'; stanza: number; review?: boolean }
  /** The last line of the stanza before, and the first line of this one. */
  | { kind: 'seam'; stanza: number }
  /** The first stanza through this one. */
  | { kind: 'chain'; through: number };

interface Stanzas {
  stanzas: readonly { lines: readonly { number: number }[] }[];
}

export interface Start {
  step: Step;
  stage: Stage;
}

/** Where a step begins: a new stanza from reading it, a review from the marks, a seam or a chain from reciting. */
export function startOf(step: Step): Start {
  if (step.kind !== 'stanza') return { step, stage: 'check' };
  return { step, stage: step.review ? 'marksOnly' : 'read' };
}

/** The next stanza to practise: one that is due and not yet practised today, else the next new one. */
function pick(stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date, practised: ReadonlySet<number>) {
  const due = dueStanzas(stanzaLines, cards, now).find((i) => !practised.has(i));
  if (due !== undefined) return startOf({ kind: 'stanza', stanza: due, review: true });
  const fresh = firstNewStanza(stanzaLines.length, cards);
  return fresh === undefined ? undefined : startOf({ kind: 'stanza', stanza: fresh });
}

/** Where opening a poem begins. A poem with nothing due or new still starts from recall. */
export function firstStart(stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date): Start {
  return pick(stanzaLines, cards, now, new Set()) ?? startOf({ kind: 'stanza', stanza: 0, review: true });
}

/** What comes after a step that went well, or nothing once the session is done. */
export function nextStart(
  step: Step,
  stanzaLines: readonly (readonly number[])[],
  cards: Cards,
  now: Date,
  practised: ReadonlySet<number>,
): Start | undefined {
  if (step.kind === 'stanza' && !step.review && step.stanza > 0) return startOf({ kind: 'seam', stanza: step.stanza });
  if (step.kind === 'seam') return startOf({ kind: 'chain', through: step.stanza });
  return pick(stanzaLines, cards, now, practised);
}

/** The lines on the page during a step, by number. */
export function linesOf(step: Step, poem: Stanzas): number[] {
  const numbers = (index: number) => poem.stanzas[index]?.lines.map((l) => l.number) ?? [];
  switch (step.kind) {
    case 'stanza':
      return numbers(step.stanza);
    case 'seam':
      return [numbers(step.stanza - 1).at(-1), numbers(step.stanza)[0]].filter((n): n is number => n !== undefined);
    case 'chain':
      return Array.from({ length: step.through + 1 }, (_, i) => numbers(i)).flat();
  }
}

/** The stanzas a step touches, by index. */
export function stanzasOf(step: Step): number[] {
  switch (step.kind) {
    case 'stanza':
      return [step.stanza];
    case 'seam':
      return [step.stanza - 1, step.stanza];
    case 'chain':
      return Array.from({ length: step.through + 1 }, (_, i) => i);
  }
}
