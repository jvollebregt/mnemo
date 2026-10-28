import { describe, expect, it } from 'vitest';
import { emptyMarks, toggleBeat, settle } from '../pencil/marks';
import { MarksStore } from './marks';
import { migrate } from './migrations';
import { Poems } from './poems';
import { openSqlJs } from './sqljs';

describe('MarksStore', () => {
  it('starts a poem with no marks and keeps what the reader saves', async () => {
    const db = await openSqlJs();
    await migrate(db);
    const poem = await new Poems(db).add({ title: 'Hope', poet: '', language: 'en', text: 'a line' });
    const marks = new MarksStore(db);
    expect(await marks.get(poem.id)).toEqual(emptyMarks());

    const marked = settle(toggleBeat(emptyMarks(), 0, 2), 0);
    await marks.save(poem.id, marked);
    expect(await marks.get(poem.id)).toEqual(marked);

    const again = toggleBeat(marked, 0, 2);
    await marks.save(poem.id, again);
    expect(await marks.get(poem.id)).toEqual(again);
  });
});
