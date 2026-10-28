import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from './browserFile';

describe('browser database file', () => {
  it('is empty at first, then gives back what was written', async () => {
    expect(await readFile('missing')).toBeUndefined();
    await writeFile('db', new Uint8Array([1, 2, 3]));
    expect(await readFile('db')).toEqual(new Uint8Array([1, 2, 3]));
  });
});
