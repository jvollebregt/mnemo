import type { Db } from './db';
import type { Files } from './files';

export interface Recital {
  data: Uint8Array;
  /** The audio's media type, as the recorder made it. */
  type: string;
  recordedAt: string;
}

/** Poem ids become file names, so only plain ids are accepted. */
const PLAIN_ID = /^[\w-]{1,64}$/;

/**
 * The reader's latest recital of each poem, kept only when they choose to
 * keep it. One per poem: a new recital replaces the one before, so
 * recordings never pile up.
 */
export class Recordings {
  constructor(
    private readonly db: Db,
    private readonly files: Files,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async keep(poemId: string, data: Uint8Array, type: string): Promise<void> {
    if (!PLAIN_ID.test(poemId)) throw new Error('A recital needs a plain poem id.');
    const file = `recitals/${poemId}`;
    await this.files.write(file, data);
    await this.db.run(
      `INSERT INTO recordings (poem_id, file, type, bytes, recorded_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (poem_id) DO UPDATE SET file = excluded.file, type = excluded.type, bytes = excluded.bytes, recorded_at = excluded.recorded_at`,
      [poemId, file, type, data.byteLength, this.now().toISOString()],
    );
  }

  async get(poemId: string): Promise<Recital | undefined> {
    const [row] = await this.db.all<{ file: string; type: string; recorded_at: string }>(
      'SELECT file, type, recorded_at FROM recordings WHERE poem_id = ?',
      [poemId],
    );
    if (!row) return undefined;
    const data = await this.files.read(row.file);
    return data && { data, type: row.type, recordedAt: row.recorded_at };
  }

  /** The space all kept recitals take, in bytes. */
  async bytesUsed(): Promise<number> {
    const [row] = await this.db.all<{ used: number | null }>('SELECT SUM(bytes) AS used FROM recordings');
    return row?.used ?? 0;
  }

  /** Lets one poem's recital go. */
  async forget(poemId: string): Promise<void> {
    const rows = await this.db.all<{ file: string }>('SELECT file FROM recordings WHERE poem_id = ?', [poemId]);
    for (const { file } of rows) await this.files.remove(file);
    await this.db.run('DELETE FROM recordings WHERE poem_id = ?', [poemId]);
  }

  async clear(): Promise<void> {
    const rows = await this.db.all<{ file: string }>('SELECT file FROM recordings');
    for (const { file } of rows) await this.files.remove(file);
    await this.db.run('DELETE FROM recordings');
  }
}
