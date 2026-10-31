/**
 * When each part of a poem comes back. Every part (a "stanza" here) and
 * every line has its own FSRS card, graded from what the reader actually
 * recalled: their own rating for the part in hand, the words they missed for
 * any other part recited with it, and for each line the words they got. The
 * recital has no aids, so nothing was seen that needs counting against them.
 */
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { Stage } from './stages';

export type { Card } from 'ts-fsrs';

/** A stanza by its index, or a line by its number, as stored: "stanza:0", "line:3". */
export type Unit = `stanza:${number}` | `line:${number}`;
export const stanzaUnit = (index: number): Unit => `stanza:${index}`;
export const lineUnit = (number: number): Unit => `line:${number}`;

export type Cards = ReadonlyMap<Unit, Card>;

/** How the reader rated a recital: not yet · most of it · all of it. */
export type Verdict = 'notYet' | 'most' | 'all';

/** A stanza is by heart once its reviews have spread out this far. */
export const BY_HEART_DAYS = 21;

const scheduler = fsrs({ enable_fuzz: true });

export function review(card: Card | undefined, grade: Grade, now: Date): Card {
  return scheduler.next(card ?? createEmptyCard(now), now, grade).card;
}

export function stanzaGrade(verdict: Verdict): Grade {
  if (verdict === 'notYet') return Rating.Again;
  return verdict === 'all' ? Rating.Good : Rating.Hard;
}

/** A line, or a part recited beside the one in hand, is good when every word came back; hard when at least half did; otherwise it starts again. */
export function lineGrade(recalled: number, words: number): Grade {
  if (words > 0 && recalled >= words) return Rating.Good;
  return recalled * 2 >= words ? Rating.Hard : Rating.Again;
}

/**
 * A part already learned, recited along with the part in hand or with the
 * whole poem: graded by the words missed in it, never better than the reader's
 * own rating. Recited without a miss before it was due, it is left as it was,
 * so going over it again doesn't push it further off than it has earned.
 */
export function alongGrade(verdict: Verdict, recalled: number, words: number, card: Card, now: Date): Grade | undefined {
  if (recalled >= words && !isDue(card, now)) return undefined;
  return Math.min(stanzaGrade(verdict), lineGrade(recalled, words)) as Grade;
}

const endOfDay = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

/** A card in review is due on its day; one still being learned is due to the minute. */
export function isDue(card: Card, now: Date): boolean {
  if (card.state === State.New) return false;
  return card.due <= (card.state === State.Review ? endOfDay(now) : now);
}

/** The stanzas due again, by index: their own card is due, or one of their lines is. */
export function dueStanzas(stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date): number[] {
  const due = (unit: Unit) => {
    const card = cards.get(unit);
    return !!card && isDue(card, now);
  };
  return stanzaLines.flatMap((lines, index) => (due(stanzaUnit(index)) || lines.some((n) => due(lineUnit(n))) ? [index] : []));
}

/** The first stanza the reader has never recited, if any. */
export function firstNewStanza(stanzaCount: number, cards: Cards): number | undefined {
  for (let i = 0; i < stanzaCount; i += 1) if (!cards.has(stanzaUnit(i))) return i;
  return undefined;
}

/**
 * Where a stanza that comes back starts, from how likely the reader still
 * knows it (its weakest card): straight to the blank page when it is
 * probably still there, and further back along the fade the longer they
 * have been away.
 */
export function returnStage(cards: readonly Card[], now: Date): Stage {
  const known = cards.filter((c) => c.state !== State.New);
  if (known.length === 0) return 'marksOnly';
  const likely = Math.min(...known.map((c) => scheduler.get_retrievability(c, now, false)));
  // A stanza recited on time sits near 0.9; these bands are weeks to months overdue.
  if (likely >= 0.85) return 'blank';
  if (likely >= 0.75) return 'fadeMarks';
  if (likely >= 0.6) return 'marksOnly';
  return 'fadeWords';
}

export type PoemState = 'takingRoot' | 'fading' | 'byHeart';

/** The one phrase the contents page shows for a poem. */
export function poemState(stanzaLines: readonly (readonly number[])[], cards: Cards, now: Date): PoemState {
  if (dueStanzas(stanzaLines, cards, now).length > 0) return 'fading';
  const settled = stanzaLines.every((_, i) => {
    const card = cards.get(stanzaUnit(i));
    return card?.state === State.Review && card.scheduled_days >= BY_HEART_DAYS;
  });
  return settled ? 'byHeart' : 'takingRoot';
}

export type StanzaState = 'new' | PoemState;

/**
 * How a stanza stands, for its numeral at the foot of the page: by the
 * schedule, and by the reader's own last verdict. A stanza they last said
 * they had only most of, or not yet, is fading whatever the schedule says.
 */
export function stanzaState(
  index: number,
  stanzaLines: readonly (readonly number[])[],
  cards: Cards,
  lastGrades: ReadonlyMap<Unit, Grade>,
  now: Date,
): StanzaState {
  const card = cards.get(stanzaUnit(index));
  if (!card) return 'new';
  const last = lastGrades.get(stanzaUnit(index));
  if ((last !== undefined && last < Rating.Good) || dueStanzas(stanzaLines, cards, now).includes(index)) return 'fading';
  return card.state === State.Review && card.scheduled_days >= BY_HEART_DAYS ? 'byHeart' : 'takingRoot';
}

