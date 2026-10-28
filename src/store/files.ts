/**
 * Files the app keeps in its own storage, beside the database: so far only
 * recitals. On the phone they live in the app's data folder (and so in the
 * phone's own backup); in the browser, in IndexedDB.
 */
export interface Files {
  write(name: string, data: Uint8Array): Promise<void>;
  read(name: string): Promise<Uint8Array | undefined>;
  /** Removing a file that isn't there is not an error. */
  remove(name: string): Promise<void>;
}

/** Files held in memory, for tests. */
export function memoryFiles(): Files {
  const files = new Map<string, Uint8Array>();
  return {
    write: async (name, data) => void files.set(name, data),
    read: async (name) => files.get(name),
    remove: async (name) => void files.delete(name),
  };
}

export async function browserFiles(): Promise<Files> {
  const { readFile, writeFile, removeFile } = await import('./browserFile');
  return { write: writeFile, read: readFile, remove: removeFile };
}
