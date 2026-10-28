import { Rating, State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { review, stanzaUnit, type Card, type Unit } from './schedule';
import { firstStart, linesOf, nextStart, stanzasOf, type Start } from './session';

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
  it('learns each stanza, then its seam with the one before, then all of them so far', () => {
    const cards = new Map<Unit, Card>();
    const practised = new Set<number>();
    const starts: Start[] = [firstStart(STANZAS, cards, NOW)];
    for (;;) {
      const { step } = starts.at(-1)!;
      if (step.kind === 'stanza') {
        cards.set(stanzaUnit(step.stanza), learned(new Date(2026, 9, 31)));
        practised.add(step.stanza);
      }
      const next = nextStart(step, STANZAS, cards, NOW, practised);
      if (!next) break;
      starts.push(next);
    }
    expect(starts.map(({ step, stage }) => `${JSON.stringify(step)} ${stage}`)).toEqual([
      '{"kind":"stanza","stanza":0} read',
      '{"kind":"stanza","stanza":1} read',
      '{"kind":"seam","stanza":1} blank',
      '{"kind":"chain","through":1} blank',
      '{"kind":"stanza","stanza":2} read',
      '{"kind":"seam","stanza":2} blank',
      '{"kind":"chain","through":2} blank',
    ]);
  });

  it('brings due stanzas back first, from the marks, then goes on with a new one', () => {
    const cards = new Map<Unit, Card>([
      [stanzaUnit(0), learned(new Date(2026, 9, 30))],
      [stanzaUnit(1), learned(NOW)],
    ]);
    const first = firstStart(STANZAS, cards, NOW);
    expect(first).toEqual({ step: { kind: 'stanza', stanza: 1, review: true }, stage: 'marksOnly' });
    // A review doesn't lead to a seam; the next new stanza follows.
    expect(nextStart(first.step, STANZAS, cards, NOW, new Set([1]))).toEqual({
      step: { kind: 'stanza', stanza: 2 },
      stage: 'read',
    });
  });

  it('starts a poem with nothing due from recall, never from rereading', () => {
    const cards = new Map<Unit, Card>(STANZAS.map((_, i) => [stanzaUnit(i), learned(new Date(2026, 10, 20))]));
    expect(firstStart(STANZAS, cards, NOW)).toEqual({ step: { kind: 'stanza', stanza: 0, review: true }, stage: 'marksOnly' });
    expect(nextStart({ kind: 'stanza', stanza: 0, review: true }, STANZAS, cards, NOW, new Set([0]))).toBeUndefined();
  });

  it('sets the lines of each step', () => {
    expect(linesOf({ kind: 'stanza', stanza: 1 }, poem)).toEqual([3, 4]);
    expect(linesOf({ kind: 'seam', stanza: 2 }, poem)).toEqual([4, 5]);
    expect(linesOf({ kind: 'chain', through: 1 }, poem)).toEqual([1, 2, 3, 4]);
    expect(stanzasOf({ kind: 'seam', stanza: 2 })).toEqual([1, 2]);
    expect(stanzasOf({ kind: 'chain', through: 2 })).toEqual([0, 1, 2]);
  });
});
