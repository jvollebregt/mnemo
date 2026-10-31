/**
 * The order of practice through a poem. Parts that are due come back first,
 * starting from the reader's marks, never from rereading. Then the next new
 * part goes through the whole method. Its recital takes in the parts learned
 * before it, from the top (or, deep into a long poem, from two parts back),
 * so every join between parts is practised as the poem grows. The reader can
 * also recite the whole poem whenever they like.
 */
import { dueStanzas, firstNewStanza, lineUnit, returnStage, stanzaUnit, type Card, type Cards } from './schedule';
import type { Stage } from './stages';

export type Step =
  /**
   * One part, from reading it to its recital; or, when it comes back for
   * review, from its marks. The recital starts at part `from` (this one, if
   * not given) and goes on to the end of this one.
   */
  | { kind: 'stanza'; stanza: number; review?: boolean; from?: number }
  /** The whole poem, from part `from`, recited at the reader's wish. */
  | { kind: 'whole'; from: number };

interface Stanzas {
  stanzas: readonly { lines: readonly { number: number }[] }[];
}

export interface Start {
  step: Step;
  stage: Stage;
}

/** From this part on, a recital no longer goes back to the top, only this far. */
const LONG_CHAIN = 4;
const CHAIN_BACK = 2;

/** Where a new part's recital starts: as far back as the parts before it are learned, from the top or two parts back. */
export function chainFrom(stanza: number, cards: Cards): number {
  const floor = stanza >= LONG_CHAIN ? stanza - CHAIN_BACK : 0;
  let from = stanza;
  while (from > floor && cards.has(stanzaUnit(from - 1))) from -= 1;
  return from;
}

/** Where a step begins: a new part from reading it, a part coming back from its marks, the whole poem from the recital. */
export function startOf(step: Step): Start {
  if (step.kind === 'whole') return { step, stage: 'blank' };
  return { step, stage: step.review ? 'marksOnly' : 'read' };
}

/** A new part, read first, its recital taking in the parts learned before it. */
export const newStart = (stanza: number, cards: Cards): Start =>
  startOf({ kind: 'stanza', stanza, from: chainFrom(stanza, cards) });

/** A part coming back starts as far along the fade as the reader probably still knows it. */
export function reviewStart(stanza: number, stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date): Start {
  const own = [stanzaUnit(stanza), ...(stanzaLines[stanza] ?? []).map(lineUnit)]
    .map((unit) => cards.get(unit))
    .filter((card): card is Card => !!card);
  return { step: { kind: 'stanza', stanza, review: true }, stage: returnStage(own, now) };
}

/** The next part to practise: one that is due and not yet practised today, else the next new one. */
function pick(stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date, practised: ReadonlySet<number>) {
  const due = dueStanzas(stanzaLines, cards, now).find((i) => !practised.has(i));
  if (due !== undefined) return reviewStart(due, stanzaLines, cards, now);
  const fresh = firstNewStanza(stanzaLines.length, cards);
  return fresh === undefined ? undefined : newStart(fresh, cards);
}

/** Where opening a poem begins. A poem with nothing due or new still starts from recall. */
export function firstStart(stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date): Start {
  return pick(stanzaLines, cards, now, new Set()) ?? reviewStart(0, stanzaLines, cards, now);
}

/** What comes after a step that went well, or nothing once the session is done. */
export function nextStart(
  stanzaLines: readonly (readonly number[])[],
  cards: Cards,
  now: Date,
  practised: ReadonlySet<number>,
): Start | undefined {
  return pick(stanzaLines, cards, now, practised);
}

/** The parts a step touches at a stage, by index: on the recital, every part recited. */
export function stanzasOf(step: Step, stage: Stage, count: number): number[] {
  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
  if (step.kind === 'whole') return range(step.from, count - 1);
  return stage === 'blank' ? range(step.from ?? step.stanza, step.stanza) : [step.stanza];
}

/** The lines on the page during a step, by number. */
export function linesOf(step: Step, stage: Stage, poem: Stanzas): number[] {
  return stanzasOf(step, stage, poem.stanzas.length).flatMap((i) => poem.stanzas[i]?.lines.map((l) => l.number) ?? []);
}

/** On the recital, the line just before the first part recited, faint, the way one comes to it. */
export function leadIn(step: Step, stage: Stage, poem: Stanzas): number | undefined {
  if (stage !== 'blank') return undefined;
  const first = stanzasOf(step, stage, poem.stanzas.length)[0];
  return first ? poem.stanzas[first - 1]?.lines.at(-1)?.number : undefined;
}
