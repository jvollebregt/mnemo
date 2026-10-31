import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from './db';
import { MarksStore } from './marks';
import { migrate } from './migrations';
import { Poems } from './poems';
import { openSqlJs } from './sqljs';

describe('Poems', () => {
  let db: Db;
  let poems: Poems;
  let clock: number;
  let ids: number;

  beforeEach(async () => {
    db = await openSqlJs();
    await migrate(db);
    clock = Date.parse('2026-10-28T12:00:00Z');
    ids = 0;
    poems = new Poems(
      db,
      () => new Date((clock += 1000)),
      () => `poem-${(ids += 1)}`,
    );
  });

  it('stores a poem and gives it back', async () => {
    const added = await poems.add({ title: ' Hope ', poet: 'Emily Dickinson ', language: 'en', text: 'a\nb\n\nc' });
    expect(added).toMatchObject({ id: 'poem-1', title: 'Hope', poet: 'Emily Dickinson' });
    expect(await poems.get('poem-1')).toEqual(added);
    expect(await poems.get('nothing')).toBeUndefined();
  });

  it('removes a poem with its marks, schedule and recital row, and only that poem', async () => {
    const hope = await poems.add({ title: 'Hope', poet: '', language: 'en', text: 'a line' });
    const stone = await poems.add({ title: 'Stone', poet: '', language: 'en', text: 'a stone' });
    const marks = new MarksStore(db);
    for (const poem of [hope, stone]) {
      await marks.save(poem.id, { ...(await marks.get(poem.id)), settled: [1] });
      await db.run(
        "INSERT INTO recordings (poem_id, file, type, bytes, recorded_at) VALUES (?, 'f', 'audio/mp4', 1, '2026-10-28')",
        [poem.id],
      );
    }
    await poems.remove(hope.id);
    expect((await poems.list()).map((p) => p.title)).toEqual(['Stone']);
    expect(await db.all('SELECT poem_id FROM marks')).toEqual([{ poem_id: stone.id }]);
    expect(await db.all('SELECT poem_id FROM recordings')).toEqual([{ poem_id: stone.id }]);
  });

  it('keeps corrections, moving marks and schedule along with the unchanged lines', async () => {
    // Stanzas of four lines with words enough, so that each is learned as a part of its own.
    const stanza = (...firsts: string[]) => firsts.map((w) => `${w} line of words enough to count`).join('\n');
    const text = [stanza('a', 'too', 'more', 'last'), stanza('third', 'b', 'c', 'd'), stanza('e', 'f', 'g', 'h')].join('\n\n');
    const before = await poems.add({ title: 'The Fall', poet: 'W.H. Ayden', language: 'en', text });
    const marks = new MarksStore(db);
    await marks.save(before.id, { ...(await marks.get(before.id)), beats: ['1:0', '2:0', '5:0'], settled: [1, 2, 5] });
    for (const unit of ['line:1', 'line:2', 'line:5', 'stanza:0', 'stanza:1'])
      await db.run("INSERT INTO cards (poem_id, unit, data, updated_at) VALUES (?, ?, '{}', 'x')", [before.id, unit]);
    await db.run("INSERT INTO reviews (poem_id, unit, grade, reviewed_at) VALUES (?, 'stanza:1', 3, 'x')", [before.id]);

    const corrected = `${stanza('new', 'new', 'new', 'new')}\n\n${text.replace('too line', 'two line')}`;
    const after = await poems.correct(before, { ...before, poet: ' W.H. Auden ', text: corrected });
    expect(after).toMatchObject({ id: before.id, poet: 'W.H. Auden', createdAt: before.createdAt });
    expect(after.updatedAt > before.updatedAt).toBe(true);
    expect(await poems.get(before.id)).toEqual(after);
    expect(await marks.get(before.id)).toMatchObject({ beats: ['5:0', '9:0'], settled: [5, 9] });
    const units = await db.all<{ unit: string }>('SELECT unit FROM cards WHERE poem_id = ? ORDER BY unit', [before.id]);
    expect(units.map((u) => u.unit)).toEqual(['line:5', 'line:9', 'stanza:2']);
    expect(await db.all('SELECT unit, grade FROM reviews')).toEqual([{ unit: 'stanza:2', grade: 3 }]);
  });

  it('lists the newest poem first', async () => {
    await poems.add({ title: 'First', poet: '', language: 'en', text: 'a' });
    await poems.add({ title: 'Tweede', poet: '', language: 'nl', text: 'b' });
    expect((await poems.list()).map((p) => p.title)).toEqual(['Tweede', 'First']);
  });

  it('refuses a poem with no title or no lines', async () => {
    await expect(poems.add({ title: '  ', poet: '', language: 'en', text: 'a' })).rejects.toThrow(/title/);
    await expect(poems.add({ title: 'T', poet: '', language: 'en', text: '\n \n' })).rejects.toThrow(/lines/);
  });

  it('keeps long lines and punctuation exactly as given', async () => {
    const text =
      'When I sitting heard the astronomer where he lectured with much applause in the lecture-room,\n“Hope” — is it?';
    const { id } = await poems.add({ title: 'T', poet: '', language: 'en', text });
    expect((await poems.get(id))?.text).toBe(text);
  });
});
