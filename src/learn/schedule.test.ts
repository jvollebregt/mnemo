import { Rating, State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import {
  BY_HEART_DAYS,
  dueStanzas,
  firstNewStanza,
  isDue,
  alongGrade,
  lineGrade,
  lineUnit,
  poemState,
  returnStage,
  review,
  stanzaGrade,
  stanzaState,
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
  it('takes the reader\'s own rating for the part in hand', () => {
    expect(stanzaGrade('notYet')).toBe(Rating.Again);
    expect(stanzaGrade('most')).toBe(Rating.Hard);
    expect(stanzaGrade('all')).toBe(Rating.Good);
  });

  it('grades a line by the words that came back', () => {
    expect(lineGrade(5, 5)).toBe(Rating.Good);
    expect(lineGrade(3, 5)).toBe(Rating.Hard);
    expect(lineGrade(2, 5)).toBe(Rating.Again);
  });

  it('grades a part recited along with another by its misses, and leaves one recited well before it was due', () => {
    const now = new Date(2026, 9, 28, 12);
    const later = reviewing(new Date(2026, 10, 10), 10);
    const due = reviewing(new Date(2026, 9, 27), 10);
    expect(alongGrade('all', 20, 20, later, now)).toBeUndefined();
    expect(alongGrade('all', 20, 20, due, now)).toBe(Rating.Good);
    expect(alongGrade('all', 15, 20, later, now)).toBe(Rating.Hard);
    expect(alongGrade('all', 5, 20, later, now)).toBe(Rating.Again);
    expect(alongGrade('notYet', 20, 20, due, now)).toBe(Rating.Again);
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

describe('how a stanza stands', () => {
  const learned = new Map<Unit, Card>([
    [stanzaUnit(0), reviewing(days(4))],
    [stanzaUnit(1), reviewing(days(40), 30)],
  ]);
  const good = new Map<Unit, Rating.Good>([
    [stanzaUnit(0), Rating.Good],
    [stanzaUnit(1), Rating.Good],
  ]);

  it('is new until first recited, then taking root, then by heart', () => {
    expect(stanzaState(0, STANZAS, new Map(), new Map(), NOW)).toBe('new');
    expect(stanzaState(0, STANZAS, learned, good, NOW)).toBe('takingRoot');
    expect(stanzaState(1, STANZAS, learned, good, NOW)).toBe('byHeart');
  });

  it('is fading when it is due, or when the reader last said not yet or most of it', () => {
    expect(stanzaState(0, STANZAS, learned, good, days(4))).toBe('fading');
    expect(stanzaState(1, STANZAS, learned, new Map([[stanzaUnit(1), Rating.Hard]]), NOW)).toBe('fading');
    expect(stanzaState(1, STANZAS, learned, new Map([[stanzaUnit(1), Rating.Again]]), NOW)).toBe('fading');
  });
});

describe('where a returning stanza starts', () => {
  const recited = (daysAgo: number, stability: number): Card => ({
    ...reviewing(NOW),
    stability,
    last_review: days(-daysAgo),
  });

  it('goes further back along the fade the less likely it is still known', () => {
    expect(returnStage([recited(1, 30)], NOW)).toBe('blank');
    expect(returnStage([recited(20, 5)], NOW)).toBe('fadeMarks');
    expect(returnStage([recited(60, 5)], NOW)).toBe('marksOnly');
    expect(returnStage([recited(365, 2)], NOW)).toBe('fadeWords');
  });

  it('follows the weakest of a stanza\'s cards', () => {
    expect(returnStage([recited(1, 30), recited(365, 2)], NOW)).toBe('fadeWords');
  });
});
