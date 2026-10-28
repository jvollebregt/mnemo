import type { Grade } from 'ts-fsrs';
import type { Card, Unit } from '../learn/schedule';
import type { Db } from './db';

const UNIT = /^(stanza|line):\d+$/;

/** Reads a stored card back, with its dates as dates. */
function readCard(json: string): Card | undefined {
  try {
    const data = JSON.parse(json) as Card & { due: string; last_review?: string };
    const due = new Date(data.due);
    if (Number.isNaN(due.getTime())) return undefined;
    return { ...data, due, ...(data.last_review ? { last_review: new Date(data.last_review) } : {}) };
  } catch {
    return undefined;
  }
}

/** When each stanza and line of each poem comes back. */
export class Schedule {
  /** Saves run one after another, since each is a transaction of its own. */
  private saving: Promise<void> = Promise.resolve();

  constructor(private readonly db: Db) {}

  async cards(poemId: string): Promise<Map<Unit, Card>> {
    // Reads wait for the saves before them, so they never miss a grade just given.
    await this.saving;
    const rows = await this.db.all<{ unit: string; data: string }>('SELECT unit, data FROM cards WHERE poem_id = ?', [poemId]);
    return toCards(rows);
  }

  /** Every poem's cards, for the contents page. */
  async all(): Promise<Map<string, Map<Unit, Card>>> {
    await this.saving;
    const rows = await this.db.all<{ poem_id: string; unit: string; data: string }>('SELECT poem_id, unit, data FROM cards');
    const byPoem = new Map<string, { unit: string; data: string }[]>();
    for (const row of rows) byPoem.set(row.poem_id, [...(byPoem.get(row.poem_id) ?? []), row]);
    return new Map([...byPoem].map(([id, poemRows]) => [id, toCards(poemRows)]));
  }

  /** Keeps graded cards, and the grades they were given, all together or not at all. */
  save(poemId: string, graded: readonly { unit: Unit; card: Card; grade: Grade }[], now: Date): Promise<void> {
    const at = now.toISOString();
    const write = () =>
      this.db.transaction(async () => {
        for (const { unit, card, grade } of graded) {
          await this.db.run(
            `INSERT INTO cards (poem_id, unit, data, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT (poem_id, unit) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
            [poemId, unit, JSON.stringify(card), at],
          );
          await this.db.run('INSERT INTO reviews (poem_id, unit, grade, reviewed_at) VALUES (?, ?, ?, ?)', [
            poemId,
            unit,
            grade,
            at,
          ]);
        }
      });
    const done = this.saving.then(write);
    this.saving = done.catch((error: unknown) => console.error(error));
    return done;
  }
}

function toCards(rows: readonly { unit: string; data: string }[]): Map<Unit, Card> {
  const cards = new Map<Unit, Card>();
  for (const { unit, data } of rows) {
    const card = readCard(data);
    if (card && UNIT.test(unit)) cards.set(unit as Unit, card);
  }
  return cards;
}
