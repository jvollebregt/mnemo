/**
 * The export file: everything the reader has made, as one JSON file they can
 * keep, move to a new phone, and read back in. Recitals stay out of it: they
 * are the one thing that can grow large, and they are only ever the latest.
 *
 * A file from an older version of the app is first set up in a scratch
 * database at its own version and brought forward by the usual migrations,
 * so the file format never needs its own conversions.
 */
import type { Db, SqlValue } from './db';
import { latestVersion, migrate, schemaVersion } from './migrations';

/** The tables that go into the file, parents before children. */
const TABLES = ['poems', 'seen_notes', 'settings', 'marks', 'cards', 'reviews'] as const;
type Table = (typeof TABLES)[number];
type Row = Record<string, SqlValue>;

export interface ExportFile {
  app: 'mnemo';
  /** The database version the rows were written at. */
  schema: number;
  exportedAt: string;
  tables: Partial<Record<Table, Row[]>>;
}

export type ImportProblem = 'notMnemo' | 'newer' | 'damaged';

export class ImportError extends Error {
  constructor(readonly problem: ImportProblem) {
    super(`The file could not be read in (${problem}).`);
  }
}

/** Poem ids become file names for recitals, so only plain ids are read in. */
const PLAIN_ID = /^[\w-]{1,64}$/;

async function tablesIn(db: Db): Promise<Set<string>> {
  const rows = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  return new Set(rows.map((r) => r.name));
}

async function columnsOf(db: Db, table: Table): Promise<string[]> {
  const rows = await db.all<{ name: string }>('SELECT name FROM pragma_table_info(?)', [table]);
  return rows.map((r) => r.name);
}

async function readTables(db: Db): Promise<ExportFile['tables']> {
  const present = await tablesIn(db);
  const tables: ExportFile['tables'] = {};
  for (const table of TABLES) {
    if (present.has(table)) tables[table] = await db.all<Row>(`SELECT * FROM ${table}`);
  }
  return tables;
}

export async function exportAll(db: Db, now = new Date()): Promise<ExportFile> {
  return { app: 'mnemo', schema: await schemaVersion(db), exportedAt: now.toISOString(), tables: await readTables(db) };
}

const isValue = (v: unknown): v is SqlValue => v === null || typeof v === 'string' || typeof v === 'number';

/** Checks the file's shape, so nothing but plain rows of plain values reaches the database. */
export function readExport(text: string): ExportFile {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new ImportError('notMnemo');
  }
  if (typeof file !== 'object' || file === null || (file as { app?: unknown }).app !== 'mnemo')
    throw new ImportError('notMnemo');
  const { schema, exportedAt, tables } = file as Record<string, unknown>;
  if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1) throw new ImportError('damaged');
  if (schema > latestVersion) throw new ImportError('newer');
  if (typeof tables !== 'object' || tables === null) throw new ImportError('damaged');
  const checked: ExportFile['tables'] = {};
  for (const table of TABLES) {
    const rows = (tables as Record<string, unknown>)[table];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) throw new ImportError('damaged');
    for (const row of rows) {
      if (typeof row !== 'object' || row === null || !Object.values(row).every(isValue))
        throw new ImportError('damaged');
    }
    checked[table] = rows as Row[];
  }
  for (const poem of checked.poems ?? []) {
    if (typeof poem.id !== 'string' || !PLAIN_ID.test(poem.id)) throw new ImportError('damaged');
  }
  return { app: 'mnemo', schema, exportedAt: typeof exportedAt === 'string' ? exportedAt : '', tables: checked };
}

/** Writes rows using only the columns the table really has. */
async function insert(db: Db, table: Table, rows: readonly Row[], conflict: string) {
  const columns = new Set(await columnsOf(db, table));
  for (const row of rows) {
    const keys = Object.keys(row).filter((k) => columns.has(k));
    if (keys.length === 0) continue;
    const marks = keys.map(() => '?').join(', ');
    await db.run(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${marks}) ${conflict.replace('$SET', keys.map((k) => `${k} = excluded.${k}`).join(', '))}`,
      keys.map((k) => row[k]!),
    );
  }
}

/** Brings an older file's rows up to this version of the app, through a scratch database. */
async function bringForward(file: ExportFile, scratch: () => Promise<Db>): Promise<ExportFile['tables']> {
  const db = await scratch();
  await migrate(db, file.schema);
  for (const table of TABLES) {
    const rows = file.tables[table];
    if (rows) await insert(db, table, rows, '');
  }
  await migrate(db);
  return readTables(db);
}

/**
 * Reads a file in. Poems in it are added; a poem that is already here takes
 * the file's version, with its marks and schedule. Nothing else is removed.
 * Returns how many poems the file held.
 */
export async function importAll(db: Db, text: string, scratch: () => Promise<Db>): Promise<number> {
  const file = readExport(text);
  const tables = file.schema < latestVersion ? await bringForward(file, scratch) : file.tables;
  const poemIds = (tables.poems ?? []).map((p) => p.id as string);
  await db.transaction(async () => {
    for (const id of poemIds) {
      for (const child of ['marks', 'cards', 'reviews'] as const)
        await db.run(`DELETE FROM ${child} WHERE poem_id = ?`, [id]);
    }
    await insert(db, 'poems', tables.poems ?? [], 'ON CONFLICT (id) DO UPDATE SET $SET');
    await insert(db, 'seen_notes', tables.seen_notes ?? [], 'ON CONFLICT DO NOTHING');
    await insert(db, 'settings', tables.settings ?? [], 'ON CONFLICT (key) DO UPDATE SET $SET');
    // Children only of poems that are here, so a damaged file can't leave strays.
    const here = new Set((await db.all<{ id: string }>('SELECT id FROM poems')).map((p) => p.id));
    const ofHere = (rows: readonly Row[] = []) =>
      rows.filter((r) => here.has(r.poem_id as string) && poemIds.includes(r.poem_id as string));
    await insert(db, 'marks', ofHere(tables.marks), '');
    await insert(db, 'cards', ofHere(tables.cards), '');
    await insert(db, 'reviews', ofHere(tables.reviews), '');
  });
  return poemIds.length;
}
