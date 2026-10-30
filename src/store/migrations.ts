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
  /** Work on the stored rows that plain SQL can't do, run after the statements. */
  run?: (db: Db) => Promise<void>;
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
  {
    // The reader's pencil marks, one JSON record per poem (see src/pencil/marks.ts).
    version: 3,
    statements: [
      `CREATE TABLE marks (
        poem_id TEXT PRIMARY KEY REFERENCES poems (id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    // The reader's own choices, such as the interface language, as key and value.
    version: 4,
    statements: [`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`],
  },
  {
    // The schedule: one FSRS card per stanza and per line (see src/learn/schedule.ts),
    // and every grade given, so the schedule can be tuned to the reader later.
    version: 5,
    statements: [
      `CREATE TABLE cards (
        poem_id TEXT NOT NULL REFERENCES poems (id) ON DELETE CASCADE,
        unit TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (poem_id, unit)
      )`,
      `CREATE TABLE reviews (
        poem_id TEXT NOT NULL REFERENCES poems (id) ON DELETE CASCADE,
        unit TEXT NOT NULL,
        grade INTEGER NOT NULL,
        reviewed_at TEXT NOT NULL
      )`,
    ],
  },
  {
    // The reader's latest recital of each poem, kept only when they ask for it.
    // The audio itself is a file in the app's own storage; this row says where.
    version: 6,
    statements: [
      `CREATE TABLE recordings (
        poem_id TEXT PRIMARY KEY REFERENCES poems (id) ON DELETE CASCADE,
        file TEXT NOT NULL,
        type TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        recorded_at TEXT NOT NULL
      )`,
    ],
  },
  {
    // A stanza longer than eight lines is now learned in passages, each with its
    // own place in the schedule. A stanza that was cut has no card that fits any
    // one passage, so it starts afresh; the stanzas after it move to their new index.
    version: 7,
    statements: [],
    run: async (db) => {
      const poems = await db.all<{ id: string; text: string }>('SELECT id, text FROM poems');
      for (const poem of poems) {
        const moved = stanzasCutIntoPassages(poem.text);
        if (!moved) continue;
        for (const table of ['cards', 'reviews'] as const) {
          const rows = await db.all<{ rowid: number; unit: string }>(
            `SELECT rowid, unit FROM ${table} WHERE poem_id = ? AND unit LIKE 'stanza:%'`,
            [poem.id],
          );
          const index = (unit: string) => Number(unit.slice('stanza:'.length));
          // Stanzas only move further down, so the last goes first and none lands on one not yet moved.
          rows.sort((a, b) => index(b.unit) - index(a.unit));
          for (const row of rows) {
            const to = moved.get(index(row.unit));
            if (to === undefined) await db.run(`DELETE FROM ${table} WHERE rowid = ?`, [row.rowid]);
            else await db.run(`UPDATE ${table} SET unit = ? WHERE rowid = ?`, [`stanza:${to}`, row.rowid]);
          }
        }
      }
    },
  },
];

/*
 * Frozen for migration 7: the stanzas as the app parsed them before passages,
 * and the passages as version 7 cuts them. Later changes to parsing must not
 * reach back into this migration.
 */

/** Old stanza index → new stanza index, for stanzas left whole; undefined when no stanza was cut. */
function stanzasCutIntoPassages(text: string): Map<number, number> | undefined {
  const stanzas: string[][] = [[]];
  for (const raw of text.split(/\r\n|\r|\n|\u2028|\u2029/)) {
    if (raw.trim() === '') {
      if (stanzas[stanzas.length - 1]!.length > 0) stanzas.push([]);
    } else stanzas[stanzas.length - 1]!.push(raw.replace(/\s+$/u, ''));
  }
  const moved = new Map<number, number>();
  let next = 0;
  let cut = false;
  stanzas.forEach((lines, index) => {
    if (lines.length === 0) return;
    const passages = passageCountV7(lines);
    if (passages === 1) moved.set(index, next);
    else cut = true;
    next += passages;
  });
  return cut ? moved : undefined;
}

function passageCountV7(lines: readonly string[]): number {
  if (lines.length <= 8) return 1;
  const closure = (line: string) => {
    const end = line.replace(/[\s"'’”»)\]]+$/u, '');
    return /[.!?…]$/u.test(end) ? 3 : /[;:]$/u.test(end) ? 2 : /[,\-–—]$/u.test(end) ? 1 : 0;
  };
  const cost: number[] = [0];
  const count: number[] = [0];
  for (let i = 1; i <= lines.length; i += 1) {
    cost[i] = Infinity;
    for (let size = 4; size <= 8 && size <= i; size += 1) {
      const j = i - size;
      const total = cost[j]! + (j === 0 ? 0 : (3 - closure(lines[j - 1]!)) * 3) + Math.abs(size - 6);
      if (total < cost[i]!) {
        cost[i] = total;
        count[i] = count[j]! + 1;
      }
    }
  }
  return count[lines.length]!;
}

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
      await migration.run?.(db);
      // PRAGMA takes no bound parameters; the version is a number from this file.
      await db.run(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return from;
}
