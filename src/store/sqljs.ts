import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { Db, SqlValue } from './db';

/**
 * sql.js runs SQLite as WebAssembly. It backs the browser build (for
 * development and trying things out) and the tests. On the phone the
 * Capacitor SQLite plugin is used instead.
 */
export class SqlJsDb implements Db {
  constructor(
    readonly database: Database,
    private readonly onWrite: () => void = () => {},
  ) {}

  private depth = 0;

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    this.database.run(sql, [...params]);
    if (this.depth === 0) this.onWrite();
  }

  async all<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
    const statement = this.database.prepare(sql, [...params]);
    try {
      const rows: Row[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as Row);
      return rows;
    } finally {
      statement.free();
    }
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    this.database.run('BEGIN');
    this.depth += 1;
    try {
      const result = await work();
      this.database.run('COMMIT');
      return result;
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    } finally {
      this.depth -= 1;
      if (this.depth === 0) this.onWrite();
    }
  }

  export(): Uint8Array {
    return this.database.export();
  }
}

let sql: Promise<SqlJsStatic> | undefined;

/** Loads the sql.js engine once. `wasmUrl` is where the browser finds the .wasm file; Node finds it itself. */
export function loadSqlJs(wasmUrl?: string): Promise<SqlJsStatic> {
  sql ??= initSqlJs(wasmUrl ? { locateFile: () => wasmUrl } : undefined);
  return sql;
}

export async function openSqlJs(
  options: { data?: Uint8Array; wasmUrl?: string; onWrite?: () => void } = {},
): Promise<SqlJsDb> {
  const SQL = await loadSqlJs(options.wasmUrl);
  return new SqlJsDb(new SQL.Database(options.data), options.onWrite);
}
