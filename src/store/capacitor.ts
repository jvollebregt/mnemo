import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Db, SqlValue } from './db';

/**
 * SQLite on the phone, through the Capacitor plugin. The database file lives
 * in the app's own storage and is included in the phone's own backup.
 *
 * Not exercised by the tests (they use sql.js through the same Db surface);
 * it is first run on a device in M7, when the iOS and Android projects arrive.
 */
export class CapacitorDb implements Db {
  constructor(private readonly connection: SQLiteDBConnection) {}

  private inTransaction = false;

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    // The plugin wraps each statement in its own transaction unless told not to.
    await this.connection.run(sql, [...params], !this.inTransaction);
  }

  async all<Row extends object>(sql: string, params: readonly SqlValue[] = []): Promise<Row[]> {
    const result = await this.connection.query(sql, [...params]);
    return (result.values ?? []) as Row[];
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    await this.connection.beginTransaction();
    this.inTransaction = true;
    try {
      const result = await work();
      await this.connection.commitTransaction();
      return result;
    } catch (error) {
      await this.connection.rollbackTransaction();
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }
}

export async function openCapacitorDb(name: string): Promise<CapacitorDb> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const existing = (await sqlite.isConnection(name, false)).result;
  const connection = existing
    ? await sqlite.retrieveConnection(name, false)
    : await sqlite.createConnection(name, false, 'no-encryption', 1, false);
  await connection.open();
  return new CapacitorDb(connection);
}
