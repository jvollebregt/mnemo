import { Rating, State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import {
  BY_HEART_DAYS,
  dueStanzas,
  firstNewStanza,
  isDue,
  lineGrade,
  lineUnit,
  poemState,
  review,
  stanzaGrade,
  stanzaUnit,
  type Card,
  type Unit,
} from './schedule';

const NOW = new Date(2026, 9, 28, 12, 0);
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const STANZAS = [
  [1, 2],
  [3, 4],
];

/** A card in review, due on the given day, last spread out over `interval` days. */
const reviewing = (due: Date, interval = 3): Card => ({
  ...review(undefined, Rating.Good, days(-30)),
  state: State.Review,
  due,
  scheduled_days: interval,
});

describe('grading', () => {
  it('takes the reader\'s own rating for a stanza, and a peek counts against it', () => {
    expect(stanzaGrade('notYet', false)).toBe(Rating.Again);
    expect(stanzaGrade('most', false)).toBe(Rating.Hard);
    expect(stanzaGrade('all', false)).toBe(Rating.Good);
    expect(stanzaGrade('all', true)).toBe(Rating.Hard);
  });

  it('grades a line by the words that came back unseen', () => {
    expect(lineGrade(5, 5, false)).toBe(Rating.Good);
    expect(lineGrade(5, 5, true)).toBe(Rating.Hard);
    expect(lineGrade(3, 5, false)).toBe(Rating.Hard);
    expect(lineGrade(2, 5, false)).toBe(Rating.Again);
  });

  it('brings a well-recalled card back later than a missed one', () => {
    const good = review(undefined, Rating.Good, NOW);
    const again = review(undefined, Rating.Again, NOW);
    expect(good.due.getTime()).toBeGreaterThan(again.due.getTime());
    expect(isDue(again, NOW)).toBe(false);
    expect(isDue(again, days(1))).toBe(true);
  });
});

describe('what is due', () => {
  it('finds stanzas due by their own card or one of their lines', () => {
    const cards = new Map<Unit, Card>([
      [stanzaUnit(0), reviewing(days(5))],
      [lineUnit(2), reviewing(NOW)],
      [stanzaUnit(1), reviewing(days(2))],
    ]);
    expect(dueStanzas(STANZAS, cards, NOW)).toEqual([0]);
    expect(dueStanzas(STANZAS, cards, days(2))).toEqual([0, 1]);
  });

  it('counts a review due later today as due today', () => {
    expect(isDue(reviewing(new Date(2026, 9, 28, 22, 0)), NOW)).toBe(true);
  });

  it('finds the first stanza never recited', () => {
    expect(firstNewStanza(2, new Map())).toBe(0);
    expect(firstNewStanza(2, new Map([[stanzaUnit(0), reviewing(days(1))]]))).toBe(1);
    expect(firstNewStanza(1, new Map([[stanzaUnit(0), reviewing(days(1))]]))).toBeUndefined();
  });
});

describe('the contents phrase', () => {
  it('says taking root, then fading when something is due, then by heart', () => {
    expect(poemState(STANZAS, new Map(), NOW)).toBe('takingRoot');
    const learned = new Map<Unit, Card>([
      [stanzaUnit(0), reviewing(days(4))],
      [stanzaUnit(1), reviewing(days(4))],
    ]);
    expect(poemState(STANZAS, learned, NOW)).toBe('takingRoot');
    expect(poemState(STANZAS, learned, days(4))).toBe('fading');
    const settled = new Map<Unit, Card>([
      [stanzaUnit(0), reviewing(days(30), BY_HEART_DAYS)],
      [stanzaUnit(1), reviewing(days(40), 30)],
    ]);
    expect(poemState(STANZAS, settled, NOW)).toBe('byHeart');
  });
});
