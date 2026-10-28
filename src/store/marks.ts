import { readMarks, type PoemMarks } from '../pencil/marks';
import type { Db } from './db';

/** The reader's pencil marks, kept per poem. */
export class MarksStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(poemId: string): Promise<PoemMarks> {
    const [row] = await this.db.all<{ data: string }>('SELECT data FROM marks WHERE poem_id = ?', [poemId]);
    return readMarks(row?.data);
  }

  async save(poemId: string, marks: PoemMarks): Promise<void> {
    await this.db.run(
      `INSERT INTO marks (poem_id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (poem_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [poemId, JSON.stringify(marks), this.now().toISOString()],
    );
  }
}
