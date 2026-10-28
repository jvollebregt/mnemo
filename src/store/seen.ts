import type { Db } from './db';

/** Which margin notes the reader has already been shown. Each note appears once. */
export class SeenNotes {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async has(key: string): Promise<boolean> {
    const rows = await this.db.all<{ key: string }>('SELECT key FROM seen_notes WHERE key = ?', [key]);
    return rows.length > 0;
  }

  async mark(key: string): Promise<void> {
    await this.db.run('INSERT OR IGNORE INTO seen_notes (key, seen_at) VALUES (?, ?)', [key, this.now().toISOString()]);
  }
}
