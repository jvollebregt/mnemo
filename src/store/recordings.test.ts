import { describe, expect, it } from 'vitest';
import { memoryFiles } from './files';
import { migrate } from './migrations';
import { Poems } from './poems';
import { Recordings } from './recordings';
import { openSqlJs } from './sqljs';

async function setUp() {
  const db = await openSqlJs();
  await migrate(db);
  const files = memoryFiles();
  const poem = await new Poems(db).add({ title: 'Hope', poet: '', language: 'en', text: 'a line' });
  return { db, files, poem, recordings: new Recordings(db, files) };
}

describe('Recordings', () => {
  it('keeps one recital per poem, the latest replacing the one before', async () => {
    const { poem, recordings, files } = await setUp();
    expect(await recordings.get(poem.id)).toBeUndefined();
    await recordings.keep(poem.id, new Uint8Array([1, 2, 3]), 'audio/webm');
    await recordings.keep(poem.id, new Uint8Array([4, 5]), 'audio/mp4');
    const recital = await recordings.get(poem.id);
    expect(Array.from(recital!.data)).toEqual([4, 5]);
    expect(recital!.type).toBe('audio/mp4');
    expect(await recordings.bytesUsed()).toBe(2);
    expect(await files.read(`recitals/${poem.id}`)).toBeTruthy();
  });

  it('clears every recital, files and all', async () => {
    const { db, poem, recordings, files } = await setUp();
    const other = await new Poems(db).add({ title: 'Stone', poet: '', language: 'en', text: 'a stone' });
    await recordings.keep(poem.id, new Uint8Array(10), 'audio/webm');
    await recordings.keep(other.id, new Uint8Array(5), 'audio/webm');
    expect(await recordings.bytesUsed()).toBe(15);
    await recordings.clear();
    expect(await recordings.bytesUsed()).toBe(0);
    expect(await recordings.get(poem.id)).toBeUndefined();
    expect(await files.read(`recitals/${other.id}`)).toBeUndefined();
  });

  it('refuses a poem id that is not a plain name', async () => {
    const { recordings } = await setUp();
    await expect(recordings.keep('../escape', new Uint8Array(1), 'audio/webm')).rejects.toThrow();
  });
});
