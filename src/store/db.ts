/**
 * The smallest database surface the app needs. Two adapters implement it:
 * Capacitor's SQLite plugin on the phone, and sql.js in the browser and in tests.
 */
export type SqlValue = string | number | null;

export interface Db {
  /** Runs one statement that returns no rows. */
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  /** Runs one query and returns its rows as objects. */
  all<Row extends object>(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
  /** Runs `work` inside a transaction, rolling back if it throws. */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
