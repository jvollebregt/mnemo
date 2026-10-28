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
