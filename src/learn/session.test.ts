import { Rating, State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { review, stanzaUnit, type Card, type Unit } from './schedule';
import { chainFrom, firstStart, leadIn, linesOf, nextStart, stanzasOf, type Start } from './session';

const poem = {
  stanzas: [
    { lines: [{ number: 1 }, { number: 2 }] },
    { lines: [{ number: 3 }, { number: 4 }] },
    { lines: [{ number: 5 }, { number: 6 }] },
  ],
};
const STANZAS = poem.stanzas.map((s) => s.lines.map((l) => l.number));
const NOW = new Date(2026, 9, 28, 12, 0);

const learned = (due: Date): Card => ({ ...review(undefined, Rating.Good, new Date(2026, 9, 1)), state: State.Review, due });

describe('the order of practice', () => {
  it('learns each part in turn, its recital taking in the parts learned before it', () => {
    const cards = new Map<Unit, Card>();
    const practised = new Set<number>();
    const starts: Start[] = [firstStart(STANZAS, cards, NOW)];
    for (;;) {
      const { step } = starts.at(-1)!;
      if (step.kind === 'stanza') {
        cards.set(stanzaUnit(step.stanza), learned(new Date(2026, 9, 31)));
        practised.add(step.stanza);
      }
      const next = nextStart(STANZAS, cards, NOW, practised);
      if (!next) break;
      starts.push(next);
    }
    expect(starts.map(({ step, stage }) => `${JSON.stringify(step)} ${stage}`)).toEqual([
      '{"kind":"stanza","stanza":0,"from":0} read',
      '{"kind":"stanza","stanza":1,"from":0} read',
      '{"kind":"stanza","stanza":2,"from":0} read',
    ]);
  });

  it('recites from the top, deep into a long poem from two parts back, and only through parts learned', () => {
    const cards = new Map<Unit, Card>([0, 1, 2, 3, 4, 5].map((i) => [stanzaUnit(i), learned(NOW)]));
    expect(chainFrom(3, cards)).toBe(0);
    expect(chainFrom(6, cards)).toBe(4);
    cards.delete(stanzaUnit(1));
    expect(chainFrom(3, cards)).toBe(2);
    expect(chainFrom(0, cards)).toBe(0);
  });

  it('brings due parts back first, from the marks, then goes on with a new one', () => {
    const cards = new Map<Unit, Card>([
      [stanzaUnit(0), learned(new Date(2026, 9, 30))],
      [stanzaUnit(1), learned(NOW)],
    ]);
    const first = firstStart(STANZAS, cards, NOW);
    expect(first).toEqual({ step: { kind: 'stanza', stanza: 1, review: true }, stage: 'marksOnly' });
    expect(nextStart(STANZAS, cards, NOW, new Set([1]))).toEqual({
      step: { kind: 'stanza', stanza: 2, from: 0 },
      stage: 'read',
    });
  });

  it('starts a poem with nothing due from recall, never from rereading', () => {
    const cards = new Map<Unit, Card>(STANZAS.map((_, i) => [stanzaUnit(i), learned(new Date(2026, 10, 20))]));
    expect(firstStart(STANZAS, cards, NOW)).toEqual({ step: { kind: 'stanza', stanza: 0, review: true }, stage: 'marksOnly' });
    expect(nextStart(STANZAS, cards, NOW, new Set([0]))).toBeUndefined();
  });

  it('sets the lines of each step: the part while it fades, every part recited at the recital', () => {
    const step = { kind: 'stanza', stanza: 2, from: 1 } as const;
    expect(linesOf(step, 'fadeMarks', poem)).toEqual([5, 6]);
    expect(linesOf(step, 'blank', poem)).toEqual([3, 4, 5, 6]);
    expect(stanzasOf(step, 'blank', 3)).toEqual([1, 2]);
    expect(linesOf({ kind: 'whole', from: 1 }, 'blank', poem)).toEqual([3, 4, 5, 6]);
    expect(linesOf({ kind: 'stanza', stanza: 1, review: true }, 'blank', poem)).toEqual([3, 4]);
  });

  it('shows the line before the recital, faint, unless it starts at the top', () => {
    expect(leadIn({ kind: 'stanza', stanza: 2, from: 1 }, 'blank', poem)).toBe(2);
    expect(leadIn({ kind: 'stanza', stanza: 2, from: 1 }, 'fadeMarks', poem)).toBeUndefined();
    expect(leadIn({ kind: 'whole', from: 0 }, 'blank', poem)).toBeUndefined();
  });
});
