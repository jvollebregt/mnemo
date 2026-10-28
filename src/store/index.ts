import { Capacitor } from '@capacitor/core';
import type { Db } from './db';
import { exportAll, importAll } from './exchange';
import { browserFiles, memoryFiles, type Files } from './files';
import { MarksStore } from './marks';
import { migrate } from './migrations';
import { Poems } from './poems';
import { Recordings } from './recordings';
import { Schedule } from './schedule';
import { SeenNotes } from './seen';
import { Settings } from './settings';

export interface Store {
  poems: Poems;
  seen: SeenNotes;
  marks: MarksStore;
  settings: Settings;
  schedule: Schedule;
  recordings: Recordings;
  exchange: {
    /** Everything the reader has made, as the text of an export file. */
    export(): Promise<string>;
    /** Reads an export file in; returns how many poems it held. */
    import(text: string): Promise<number>;
  };
}

interface Options {
  files?: Files;
  /** An empty database to bring an older export file forward in. */
  scratch?: () => Promise<Db>;
}

export function createStore(db: Db, { files = memoryFiles(), scratch = defaultScratch }: Options = {}): Store {
  return {
    poems: new Poems(db),
    seen: new SeenNotes(db),
    marks: new MarksStore(db),
    settings: new Settings(db),
    schedule: new Schedule(db),
    recordings: new Recordings(db, files),
    exchange: {
      export: async () => JSON.stringify(await exportAll(db), null, 1),
      import: (text) => importAll(db, text, scratch),
    },
  };
}

const defaultScratch = async (): Promise<Db> => (await import('./sqljs')).openSqlJs();

const FILE = 'mnemo.sqlite';

/** Opens the database for this device and brings it up to date. */
export async function openStore(): Promise<Store> {
  const onPhone = Capacitor.isNativePlatform();
  const db = onPhone ? await openOnPhone() : await openInBrowser();
  await migrate(db);
  const files = onPhone ? (await import('./phoneFiles')).phoneFiles() : await browserFiles();
  return createStore(db, { files, scratch: openScratch });
}

/** sql.js needs to be told where its .wasm file is, once built. */
async function openScratch(): Promise<Db> {
  const [{ openSqlJs }, { default: wasmUrl }] = await Promise.all([import('./sqljs'), import('sql.js/dist/sql-wasm.wasm?url')]);
  return openSqlJs({ wasmUrl });
}

async function openOnPhone(): Promise<Db> {
  const { openCapacitorDb } = await import('./capacitor');
  return openCapacitorDb('mnemo');
}

async function openInBrowser(): Promise<Db> {
  const [{ openSqlJs }, { readFile, writeFile }, { default: wasmUrl }] = await Promise.all([
    import('./sqljs'),
    import('./browserFile'),
    import('sql.js/dist/sql-wasm.wasm?url'),
  ]);
  let saving = Promise.resolve();
  const db = await openSqlJs({
    data: await readFile(FILE),
    wasmUrl,
    // Writes are queued so a slow save never overtakes a later one.
    onWrite: () => {
      saving = saving.then(() => writeFile(FILE, db.export())).catch((error: unknown) => console.error(error));
    },
  });
  return db;
}
