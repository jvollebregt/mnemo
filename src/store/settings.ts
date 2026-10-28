import type { Locale } from '../i18n';
import { locales } from '../i18n';
import type { Db } from './db';

export type ReciteBy = 'speaking' | 'typing';

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

  /** How the reader likes to recite: aloud, or by typing. */
  async reciteBy(): Promise<ReciteBy | undefined> {
    const value = await this.get('recite-by');
    return value === 'speaking' || value === 'typing' ? value : undefined;
  }

  async setReciteBy(way: ReciteBy): Promise<void> {
    await this.set('recite-by', way);
  }

  /** Whether to keep the latest recital of each poem. Off until the reader turns it on. */
  async keepRecitals(): Promise<boolean> {
    return (await this.get('keep-recitals')) === 'yes';
  }

  async setKeepRecitals(keep: boolean): Promise<void> {
    await this.set('keep-recitals', keep ? 'yes' : 'no');
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
