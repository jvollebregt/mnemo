import type { PoemLanguage } from '../poem/language';
import type { Db } from './db';

export interface Poem {
  id: string;
  title: string;
  poet: string;
  language: PoemLanguage;
  /** The mended text: the poet's lines, stanzas separated by one blank line. */
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type NewPoem = Pick<Poem, 'title' | 'poet' | 'language' | 'text'>;

interface PoemRow {
  id: string;
  title: string;
  poet: string;
  language: PoemLanguage;
  text: string;
  created_at: string;
  updated_at: string;
}

const fromRow = (row: PoemRow): Poem => ({
  id: row.id,
  title: row.title,
  poet: row.poet,
  language: row.language,
  text: row.text,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const COLUMNS = 'id, title, poet, language, text, created_at, updated_at';

export class Poems {
  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  async add(poem: NewPoem): Promise<Poem> {
    const title = poem.title.trim();
    if (!title) throw new Error('A poem needs a title.');
    if (!poem.text.trim()) throw new Error('A poem needs its lines.');
    const stamp = this.now().toISOString();
    const stored: Poem = { ...poem, title, poet: poem.poet.trim(), id: this.newId(), createdAt: stamp, updatedAt: stamp };
    await this.db.run(`INSERT INTO poems (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      stored.id,
      stored.title,
      stored.poet,
      stored.language,
      stored.text,
      stored.createdAt,
      stored.updatedAt,
    ]);
    return stored;
  }

  /** All poems, the most recently added first. */
  async list(): Promise<Poem[]> {
    const rows = await this.db.all<PoemRow>(`SELECT ${COLUMNS} FROM poems ORDER BY created_at DESC, rowid DESC`);
    return rows.map(fromRow);
  }

  /** Removes a poem with its marks and schedule. A kept recital is the Recordings' to forget. */
  async remove(id: string): Promise<void> {
    await this.db.transaction(async () => {
      for (const table of ['marks', 'cards', 'reviews', 'recordings'])
        await this.db.run(`DELETE FROM ${table} WHERE poem_id = ?`, [id]);
      await this.db.run('DELETE FROM poems WHERE id = ?', [id]);
    });
  }

  async get(id: string): Promise<Poem | undefined> {
    const [row] = await this.db.all<PoemRow>(`SELECT ${COLUMNS} FROM poems WHERE id = ?`, [id]);
    return row ? fromRow(row) : undefined;
  }
}
