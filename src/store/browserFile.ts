/**
 * In the browser build the whole database is one file, kept in IndexedDB.
 * Small poems make a small file, so it is simply written again after each change.
 */
const DB_NAME = 'mnemo';
const STORE = 'files';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB would not open'));
  });
}

function done(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function readFile(key: string): Promise<Uint8Array | undefined> {
  const idb = await openIdb();
  try {
    const value = await done(idb.transaction(STORE).objectStore(STORE).get(key));
    // isView rather than instanceof: the stored bytes may come back from another realm.
    return ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : undefined;
  } finally {
    idb.close();
  }
}

export async function writeFile(key: string, data: Uint8Array): Promise<void> {
  const idb = await openIdb();
  try {
    await done(idb.transaction(STORE, 'readwrite').objectStore(STORE).put(data, key));
  } finally {
    idb.close();
  }
}

export async function removeFile(key: string): Promise<void> {
  const idb = await openIdb();
  try {
    await done(idb.transaction(STORE, 'readwrite').objectStore(STORE).delete(key));
  } finally {
    idb.close();
  }
}
