import { describe, expect, it } from 'vitest';
import { exportAll, importAll, ImportError, readExport } from './exchange';
import { createStore } from './index';
import { latestVersion, migrate } from './migrations';
import { openSqlJs } from './sqljs';
import { stanzaUnit, review } from '../learn/schedule';
import { Rating } from 'ts-fsrs';

const scratch = () => openSqlJs();

async function freshDb() {
  const db = await openSqlJs();
  await migrate(db);
  return db;
}

async function phoneWithAPoem() {
  const db = await freshDb();
  const store = createStore(db);
  const poem = await store.poems.add({ title: 'Hope', poet: 'Emily Dickinson', language: 'en', text: 'a line\nanother' });
  await store.marks.save(poem.id, { ...(await store.marks.get(poem.id)), settled: [1] });
  const now = new Date('2026-10-28T12:00:00Z');
  await store.schedule.save(poem.id, [{ unit: stanzaUnit(0), card: review(undefined, Rating.Good, now), grade: Rating.Good }], now);
  await store.settings.setLocale('nl');
  await store.seen.mark('note:read');
  return { db, store, poem };
}

describe('the export file', () => {
  it('carries poems, marks, the schedule and settings to another phone', async () => {
    const { db, poem } = await phoneWithAPoem();
    const text = JSON.stringify(await exportAll(db));

    const other = await freshDb();
    expect(await importAll(other, text, scratch)).toBe(1);
    const store = createStore(other);
    expect((await store.poems.list()).map((p) => p.title)).toEqual(['Hope']);
    expect((await store.marks.get(poem.id)).settled).toEqual([1]);
    expect([...(await store.schedule.cards(poem.id)).keys()]).toEqual([stanzaUnit(0)]);
    expect(await store.settings.locale()).toBe('nl');
    expect(await store.seen.has('note:read')).toBe(true);
  });

  it('reads the same file twice without doubling anything', async () => {
    const { db } = await phoneWithAPoem();
    const text = JSON.stringify(await exportAll(db));
    await importAll(db, text, scratch);
    await importAll(db, text, scratch);
    expect(await db.all('SELECT COUNT(*) AS n FROM poems')).toEqual([{ n: 1 }]);
    expect(await db.all('SELECT COUNT(*) AS n FROM reviews')).toEqual([{ n: 1 }]);
  });

  it('adds to the poems already here, and leaves them be', async () => {
    const { db } = await phoneWithAPoem();
    const text = JSON.stringify(await exportAll(db));
    const other = await freshDb();
    const store = createStore(other);
    await store.poems.add({ title: 'Stone', poet: '', language: 'en', text: 'a stone' });
    await importAll(other, text, scratch);
    expect((await store.poems.list()).map((p) => p.title).sort()).toEqual(['Hope', 'Stone']);
  });

  it('brings a file from an older version of the app forward', async () => {
    const old = await openSqlJs();
    await migrate(old, 3);
    await old.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    await old.run(`INSERT INTO marks (poem_id, data, updated_at) VALUES ('p1', '{"settled":[1]}', '2026-10-28T12:00:00.000Z')`);
    const file = await exportAll(old);
    expect(file.schema).toBe(3);

    const db = await freshDb();
    expect(await importAll(db, JSON.stringify(file), scratch)).toBe(1);
    expect((await createStore(db).marks.get('p1')).settled).toEqual([1]);
  });

  it('refuses what is not a Mnemo file, a file from a newer app, and a damaged one', () => {
    const problem = (text: string) => {
      try {
        readExport(text);
        return 'read';
      } catch (error) {
        return error instanceof ImportError ? error.problem : 'thrown';
      }
    };
    expect(problem('not json')).toBe('notMnemo');
    expect(problem('{"app":"other"}')).toBe('notMnemo');
    expect(problem(JSON.stringify({ app: 'mnemo', schema: latestVersion + 1, tables: {} }))).toBe('newer');
    expect(problem(JSON.stringify({ app: 'mnemo', schema: 1, tables: { poems: [{ id: 'p1', title: { x: 1 } }] } }))).toBe('damaged');
    expect(problem(JSON.stringify({ app: 'mnemo', schema: 1, tables: { poems: [{ id: '../p1' }] } }))).toBe('damaged');
  });

  it('writes only the columns a table has', async () => {
    const db = await freshDb();
    const text = JSON.stringify({
      app: 'mnemo',
      schema: latestVersion,
      tables: {
        poems: [
          {
            id: 'p1',
            title: 'Hope',
            poet: '',
            language: 'en',
            text: 'a line',
            created_at: '2026-10-28T12:00:00.000Z',
            updated_at: '2026-10-28T12:00:00.000Z',
            'title) VALUES (1); DROP TABLE poems; --': 'x',
          },
        ],
      },
    });
    expect(await importAll(db, text, scratch)).toBe(1);
    expect(await db.all('SELECT title FROM poems')).toEqual([{ title: 'Hope' }]);
  });
});
