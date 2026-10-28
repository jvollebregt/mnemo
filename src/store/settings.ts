import type { Locale } from '../i18n';
import { locales } from '../i18n';
import type { Db } from './db';

/** The reader's own choices. Until one is made, the app follows the phone. */
export class Settings {
  constructor(private readonly db: Db) {}

  async locale(): Promise<Locale | undefined> {
    const value = await this.get('locale');
    return locales.find((l) => l === value);
  }

  async setLocale(locale: Locale): Promise<void> {
    await this.set('locale', locale);
  }

  private async get(key: string): Promise<string | undefined> {
    const [row] = await this.db.all<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row?.value;
  }

  private async set(key: string, value: string): Promise<void> {
    await this.db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  }
}
