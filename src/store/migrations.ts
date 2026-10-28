import type { Db } from './db';

/**
 * Every change to the stored data is a numbered migration. Migrations only
 * ever get added: a phone may skip several app updates and must still arrive
 * at the latest version with all its poems intact. Each one gets a test in
 * migrations.test.ts that migrates real data from the version before it.
 */
export interface Migration {
  version: number;
  statements: readonly string[];
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE poems (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        poet TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL CHECK (language IN ('en', 'nl')),
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    // Margin notes are shown once each; this remembers which have been seen.
    version: 2,
    statements: [`CREATE TABLE seen_notes (key TEXT PRIMARY KEY, seen_at TEXT NOT NULL)`],
  },
];

export const latestVersion = migrations.reduce((v, m) => Math.max(v, m.version), 0);

export async function schemaVersion(db: Db): Promise<number> {
  const [row] = await db.all<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Brings the database up to `target` (the latest version by default). Returns the version it started at. */
export async function migrate(db: Db, target = latestVersion): Promise<number> {
  const from = await schemaVersion(db);
  if (from > latestVersion) {
    throw new Error(`The stored data is from a newer version of the app (schema ${from}).`);
  }
  for (const migration of migrations) {
    if (migration.version <= from || migration.version > target) continue;
    await db.transaction(async () => {
      for (const statement of migration.statements) await db.run(statement);
      // PRAGMA takes no bound parameters; the version is a number from this file.
      await db.run(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return from;
}
