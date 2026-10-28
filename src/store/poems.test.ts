import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from './migrations';
import { Poems } from './poems';
import { openSqlJs } from './sqljs';

describe('Poems', () => {
  let poems: Poems;
  let clock: number;
  let ids: number;

  beforeEach(async () => {
    const db = await openSqlJs();
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
