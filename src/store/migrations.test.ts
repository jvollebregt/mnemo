import { describe, expect, it } from 'vitest';
import { latestVersion, migrate, migrations, schemaVersion } from './migrations';
import { openSqlJs } from './sqljs';

describe('migrations', () => {
  it('are numbered 1, 2, 3… without gaps', () => {
    expect(migrations.map((m) => m.version)).toEqual(migrations.map((_, i) => i + 1));
  });

  it('bring an empty database to the latest version', async () => {
    const db = await openSqlJs();
    expect(await migrate(db)).toBe(0);
    expect(await schemaVersion(db)).toBe(latestVersion);
  });

  it('do nothing the second time', async () => {
    const db = await openSqlJs();
    await migrate(db);
    expect(await migrate(db)).toBe(latestVersion);
    expect(await schemaVersion(db)).toBe(latestVersion);
  });

  it('refuse data from a newer app rather than damage it', async () => {
    const db = await openSqlJs();
    await db.run(`PRAGMA user_version = ${latestVersion + 1}`);
    await expect(migrate(db)).rejects.toThrow(/newer version/);
  });

  it('roll a failed migration back completely', async () => {
    const db = await openSqlJs();
    await expect(
      db.transaction(async () => {
        await db.run('CREATE TABLE half_done (x TEXT)');
        throw new Error('power cut');
      }),
    ).rejects.toThrow('power cut');
    expect(await db.all("SELECT name FROM sqlite_master WHERE name = 'half_done'")).toEqual([]);
  });

  // When migration 2 arrives: seed data the way version 1 stored it, migrate to
  // the latest version, and check every poem comes through unchanged.
  it('keep poems stored under version 1', async () => {
    const db = await openSqlJs();
    await migrate(db, 1);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', 'Emily Dickinson', 'en', '“Hope” is the thing with feathers -', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    await migrate(db);
    const rows = await db.all<{ id: string; title: string; text: string }>('SELECT id, title, text FROM poems');
    expect(rows).toEqual([{ id: 'p1', title: 'Hope', text: '“Hope” is the thing with feathers -' }]);
  });

  it('add the seen-notes record in version 2 without touching poems', async () => {
    const db = await openSqlJs();
    await migrate(db, 1);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    expect(await migrate(db, 2)).toBe(1);
    expect(await db.all('SELECT id FROM poems')).toEqual([{ id: 'p1' }]);
    expect(await db.all('SELECT key FROM seen_notes')).toEqual([]);
  });

  it('add the marks record in version 3, keeping poems and seen notes', async () => {
    const db = await openSqlJs();
    await migrate(db, 2);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    await db.run("INSERT INTO seen_notes (key, seen_at) VALUES ('long-lines', '2026-10-28T12:00:00.000Z')");
    expect(await migrate(db, 3)).toBe(2);
    expect(await db.all('SELECT id FROM poems')).toEqual([{ id: 'p1' }]);
    expect(await db.all('SELECT key FROM seen_notes')).toEqual([{ key: 'long-lines' }]);
    expect(await db.all('SELECT poem_id FROM marks')).toEqual([]);
  });

  it('add the settings record in version 4, keeping poems, seen notes and marks', async () => {
    const db = await openSqlJs();
    await migrate(db, 3);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    await db.run("INSERT INTO seen_notes (key, seen_at) VALUES ('long-lines', '2026-10-28T12:00:00.000Z')");
    await db.run(`INSERT INTO marks (poem_id, data, updated_at) VALUES ('p1', '{"beats":["1:0"]}', '2026-10-28T12:00:00.000Z')`);
    expect(await migrate(db, 4)).toBe(3);
    expect(await db.all('SELECT id FROM poems')).toEqual([{ id: 'p1' }]);
    expect(await db.all('SELECT key FROM seen_notes')).toEqual([{ key: 'long-lines' }]);
    expect(await db.all('SELECT data FROM marks')).toEqual([{ data: '{"beats":["1:0"]}' }]);
    expect(await db.all('SELECT key FROM settings')).toEqual([]);
  });

  it('add the schedule in version 5, keeping everything before it', async () => {
    const db = await openSqlJs();
    await migrate(db, 4);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    await db.run(`INSERT INTO marks (poem_id, data, updated_at) VALUES ('p1', '{"beats":["1:0"]}', '2026-10-28T12:00:00.000Z')`);
    await db.run("INSERT INTO settings (key, value) VALUES ('locale', 'nl')");
    expect(await migrate(db, 5)).toBe(4);
    expect(await db.all('SELECT id FROM poems')).toEqual([{ id: 'p1' }]);
    expect(await db.all('SELECT data FROM marks')).toEqual([{ data: '{"beats":["1:0"]}' }]);
    expect(await db.all('SELECT value FROM settings')).toEqual([{ value: 'nl' }]);
    expect(await db.all('SELECT unit FROM cards')).toEqual([]);
    expect(await db.all('SELECT unit FROM reviews')).toEqual([]);
  });

  it('add recordings in version 6, keeping the schedule and everything before it', async () => {
    const db = await openSqlJs();
    await migrate(db, 5);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    await db.run(`INSERT INTO cards (poem_id, unit, data, updated_at) VALUES ('p1', 'stanza:0', '{"due":"2026-10-29"}', '2026-10-28T12:00:00.000Z')`);
    await db.run("INSERT INTO reviews (poem_id, unit, grade, reviewed_at) VALUES ('p1', 'stanza:0', 3, '2026-10-28T12:00:00.000Z')");
    await db.run("INSERT INTO settings (key, value) VALUES ('recite-by', 'typing')");
    expect(await migrate(db, 6)).toBe(5);
    expect(await db.all('SELECT unit, data FROM cards')).toEqual([{ unit: 'stanza:0', data: '{"due":"2026-10-29"}' }]);
    expect(await db.all('SELECT grade FROM reviews')).toEqual([{ grade: 3 }]);
    expect(await db.all('SELECT value FROM settings')).toEqual([{ value: 'typing' }]);
    expect(await db.all('SELECT file FROM recordings')).toEqual([]);
  });

  it('in version 7, start a stanza cut into passages afresh and move the stanzas after it', async () => {
    const db = await openSqlJs();
    await migrate(db, 6);
    const block = Array.from({ length: 14 }, (_, i) => `line ${i + 1}${i === 7 ? '.' : ','}`).join('\n');
    const insert = (id: string, text: string) =>
      db.run(
        `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
         VALUES (?, 'A poem', '', 'en', ?, '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
        [id, text],
      );
    // Stanza 1 of p1 is fourteen lines long, and becomes passages 1 and 2; stanza 2 becomes 3.
    await insert('p1', `one\ntwo\n\n${block}\n\nthree\nfour`);
    await insert('p2', 'a short one\nof two\n\nand another');
    for (const [poem, unit] of [
      ['p1', 'stanza:0'],
      ['p1', 'stanza:1'],
      ['p1', 'stanza:2'],
      ['p1', 'line:5'],
      ['p2', 'stanza:0'],
      ['p2', 'stanza:1'],
    ]) {
      await db.run(`INSERT INTO cards (poem_id, unit, data, updated_at) VALUES (?, ?, '{}', '2026-10-28T12:00:00.000Z')`, [poem!, unit!]);
      await db.run(`INSERT INTO reviews (poem_id, unit, grade, reviewed_at) VALUES (?, ?, 3, '2026-10-28T12:00:00.000Z')`, [poem!, unit!]);
    }
    expect(await migrate(db, 7)).toBe(6);
    const units = async (table: string, poem: string) =>
      (await db.all<{ unit: string }>(`SELECT unit FROM ${table} WHERE poem_id = ? ORDER BY unit`, [poem])).map((r) => r.unit);
    for (const table of ['cards', 'reviews']) {
      expect(await units(table, 'p1')).toEqual(['line:5', 'stanza:0', 'stanza:3']);
      expect(await units(table, 'p2')).toEqual(['stanza:0', 'stanza:1']);
    }
  });

  it('in version 8, gather stanzas into parts, keeping the weakest card of those joined', async () => {
    const db = await openSqlJs();
    await migrate(db, 7);
    const insert = (id: string, text: string) =>
      db.run(
        `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
         VALUES (?, 'A poem', '', 'en', ?, '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
        [id, text],
      );
    const long = (name: string, n: number) =>
      Array.from({ length: n }, (_, i) => `${name} line ${i + 1} with words enough to count`).join('\n');
    // Crane: two short stanzas, now one part.
    await insert('crane', 'In the desert\nI saw a creature\n\nI said\nIs it good');
    // Four lines, then two couplets that join, then four more.
    await insert('couplets', [long('a', 4), long('b', 2), long('c', 2), long('d', 4)].join('\n\n'));
    // Four-line stanzas stay as they were.
    await insert('quatrains', [long('a', 4), long('b', 4), long('c', 4)].join('\n\n'));
    const card = (poem: string, unit: string, due: string) =>
      db.run(`INSERT INTO cards (poem_id, unit, data, updated_at) VALUES (?, ?, ?, '2026-10-28T12:00:00.000Z')`, [
        poem,
        unit,
        JSON.stringify({ due }),
      ]);
    const review = (poem: string, unit: string) =>
      db.run(`INSERT INTO reviews (poem_id, unit, grade, reviewed_at) VALUES (?, ?, 3, '2026-10-28T12:00:00.000Z')`, [poem, unit]);
    await card('crane', 'stanza:0', '2026-11-05');
    await card('crane', 'line:3', '2026-11-05');
    await review('crane', 'stanza:0');
    await card('couplets', 'stanza:0', '2026-11-01');
    await card('couplets', 'stanza:1', '2026-11-09');
    await card('couplets', 'stanza:2', '2026-11-03');
    await card('couplets', 'stanza:3', '2026-11-04');
    await review('couplets', 'stanza:2');
    await review('couplets', 'stanza:3');
    await card('quatrains', 'stanza:1', '2026-11-02');

    expect(await migrate(db, 8)).toBe(7);
    const cards = async (poem: string) =>
      (await db.all<{ unit: string; data: string }>(`SELECT unit, data FROM cards WHERE poem_id = ? ORDER BY unit`, [poem])).map(
        (r) => `${r.unit} ${(JSON.parse(r.data) as { due: string }).due}`,
      );
    const reviews = async (poem: string) =>
      (await db.all<{ unit: string }>(`SELECT unit FROM reviews WHERE poem_id = ? ORDER BY unit`, [poem])).map((r) => r.unit);
    // Crane's second stanza was never learned, so the poem, now one part, starts afresh; its lines keep their cards.
    expect(await cards('crane')).toEqual(['line:3 2026-11-05']);
    expect(await reviews('crane')).toEqual(['stanza:0']);
    // The couplets become part 1 with the sooner due of the two; the last stanza moves up to part 2.
    expect(await cards('couplets')).toEqual(['stanza:0 2026-11-01', 'stanza:1 2026-11-03', 'stanza:2 2026-11-04']);
    expect(await reviews('couplets')).toEqual(['stanza:1', 'stanza:2']);
    expect(await cards('quatrains')).toEqual(['stanza:1 2026-11-02']);
  });

  it('survive saving and reopening the database file', async () => {
    const db = await openSqlJs();
    await migrate(db);
    await db.run(
      `INSERT INTO poems (id, title, poet, language, text, created_at, updated_at)
       VALUES ('p1', 'Hope', '', 'en', 'a line', '2026-10-28T12:00:00.000Z', '2026-10-28T12:00:00.000Z')`,
    );
    const reopened = await openSqlJs({ data: db.export() });
    expect(await migrate(reopened)).toBe(latestVersion);
    expect(await reopened.all('SELECT id FROM poems')).toEqual([{ id: 'p1' }]);
  });
});
