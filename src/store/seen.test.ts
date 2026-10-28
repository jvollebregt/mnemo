import { describe, expect, it } from 'vitest';
import { migrate } from './migrations';
import { SeenNotes } from './seen';
import { openSqlJs } from './sqljs';

describe('SeenNotes', () => {
  it('remembers a note once it has been shown', async () => {
    const db = await openSqlJs();
    await migrate(db);
    const seen = new SeenNotes(db);
    expect(await seen.has('turn-phone')).toBe(false);
    await seen.mark('turn-phone');
    await seen.mark('turn-phone');
    expect(await seen.has('turn-phone')).toBe(true);
    expect(await seen.has('something-else')).toBe(false);
  });
});
