import { describe, expect, it } from 'vitest';
import { migrate } from './migrations';
import { Settings } from './settings';
import { openSqlJs } from './sqljs';

describe('Settings', () => {
  it('keeps the interface language the reader chose', async () => {
    const db = await openSqlJs();
    await migrate(db);
    const settings = new Settings(db);
    expect(await settings.locale()).toBeUndefined();
    await settings.setLocale('nl');
    await settings.setLocale('en');
    expect(await settings.locale()).toBe('en');
  });

  it('ignores a language the app no longer has', async () => {
    const db = await openSqlJs();
    await migrate(db);
    await db.run("INSERT INTO settings (key, value) VALUES ('locale', 'fr')");
    expect(await new Settings(db).locale()).toBeUndefined();
  });
});
