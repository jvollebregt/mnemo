import { Capacitor } from '@capacitor/core';
import type { Db } from './db';
import { migrate } from './migrations';
import { Poems } from './poems';

export interface Store {
  poems: Poems;
}

export function createStore(db: Db): Store {
  return { poems: new Poems(db) };
}

const FILE = 'mnemo.sqlite';

/** Opens the database for this device and brings it up to date. */
export async function openStore(): Promise<Store> {
  const db = Capacitor.isNativePlatform() ? await openOnPhone() : await openInBrowser();
  await migrate(db);
  return createStore(db);
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
