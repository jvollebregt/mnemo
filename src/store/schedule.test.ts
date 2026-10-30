import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { review, stanzaUnit, lineUnit } from '../learn/schedule';
import { migrate } from './migrations';
import { Poems } from './poems';
import { Schedule } from './schedule';
import { openSqlJs } from './sqljs';

describe('Schedule', () => {
  it('keeps each card with its dates, per poem', async () => {
    const db = await openSqlJs();
    await migrate(db);
    const poems = new Poems(db);
    const a = await poems.add({ title: 'A', poet: '', language: 'en', text: 'a line' });
    const b = await poems.add({ title: 'B', poet: '', language: 'en', text: 'b line' });
    const schedule = new Schedule(db);
    const now = new Date(2026, 9, 28, 12);
    const card = review(undefined, Rating.Good, now);
    // Saves made without waiting still go in one after another.
    void schedule.save(
      a.id,
      [
        { unit: stanzaUnit(0), card, grade: Rating.Good },
        { unit: lineUnit(1), card: review(undefined, Rating.Hard, now), grade: Rating.Hard },
      ],
      now,
    );
    await schedule.save(b.id, [{ unit: stanzaUnit(0), card, grade: Rating.Good }], now);

    const cards = await schedule.cards(a.id);
    expect([...cards.keys()].sort()).toEqual(['line:1', 'stanza:0']);
    expect(cards.get(stanzaUnit(0))).toEqual(card);
    expect((await schedule.all()).get(b.id)?.size).toBe(1);
    expect(await db.all('SELECT grade FROM reviews ORDER BY rowid')).toEqual([{ grade: 3 }, { grade: 2 }, { grade: 3 }]);
  });

  it('skips a card it can\'t read rather than fail', async () => {
    const db = await openSqlJs();
    await migrate(db);
    const poem = await new Poems(db).add({ title: 'A', poet: '', language: 'en', text: 'a line' });
    await db.run("INSERT INTO cards (poem_id, unit, data, updated_at) VALUES (?, 'stanza:0', 'not json', 'x')", [poem.id]);
    expect((await new Schedule(db).cards(poem.id)).size).toBe(0);
  });

  it('remembers the last grade each unit was given', async () => {
    const db = await openSqlJs();
    await migrate(db);
    const poem = await new Poems(db).add({ title: 'A', poet: '', language: 'en', text: 'a line' });
    const schedule = new Schedule(db);
    const now = new Date(2026, 9, 28, 12);
    const card = review(undefined, Rating.Good, now);
    await schedule.save(poem.id, [{ unit: stanzaUnit(0), card, grade: Rating.Again }], now);
    await schedule.save(poem.id, [{ unit: stanzaUnit(0), card, grade: Rating.Good }, { unit: lineUnit(1), card, grade: Rating.Hard }], now);
    const last = await schedule.lastGrades(poem.id);
    expect(last.get(stanzaUnit(0))).toBe(Rating.Good);
    expect(last.get(lineUnit(1))).toBe(Rating.Hard);
  });
});
