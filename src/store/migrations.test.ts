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
