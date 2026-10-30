import { describe, expect, it } from 'vitest';
import { emptyMarks } from '../pencil/marks';
import { parsePoem } from './parse';
import { reline, relineMarks, relineUnit } from './reline';

const BEFORE = 'Hope is the thing\nthat perches in the soul\n\nAnd sings the tune\nwithout the words';

describe('reline', () => {
  it('follows unchanged lines past a line added above them', () => {
    const moved = reline(parsePoem(BEFORE), parsePoem(`Hope is the thing with feathers\nthat perches in the soul\n\nAnd sings the tune\nwithout the words\nAnd never stops`));
    expect([...moved.lines]).toEqual([
      [2, 2],
      [3, 3],
      [4, 4],
    ]);
    // The first stanza had a line changed, the second gained one: neither carries over as a whole.
    expect([...moved.stanzas]).toEqual([]);
  });

  it('keeps a stanza that is word for word the same, wherever it moved', () => {
    const moved = reline(parsePoem(BEFORE), parsePoem(`A new first stanza\n\n${BEFORE}`));
    expect(moved.lines.get(1)).toBe(2);
    expect([...moved.stanzas]).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it('drops the marks of a changed line and moves the rest', () => {
    const moved = reline(parsePoem('one line\ntwo lines\nthree'), parsePoem('new\none line\ntwo lynes\nthree'));
    const marks = relineMarks(
      {
        beats: ['1:0', '2:4', '3:0'],
        pauses: ['1:3'],
        settled: [1, 2, 3],
        echoes: [
          { family: 1, line: 1, start: 4, end: 8 },
          { family: 1, line: 2, start: 4, end: 9 },
        ],
        splits: { 3: { 0: [2] } },
        styles: {},
      },
      moved,
    );
    expect(marks).toEqual({
      ...emptyMarks(),
      beats: ['2:0', '4:0'],
      pauses: ['2:3'],
      settled: [2, 4],
      echoes: [{ family: 1, line: 2, start: 4, end: 8 }],
      splits: { 4: { 0: [2] } },
    });
  });

  it('moves scheduled units, and lets go of those that changed', () => {
    const moved = reline(parsePoem(BEFORE), parsePoem(`New\n\n${BEFORE.replace('the words', 'a word')}`));
    expect(relineUnit('line:1', moved)).toBe('line:2');
    expect(relineUnit('line:4', moved)).toBeUndefined();
    expect(relineUnit('stanza:0', moved)).toBe('stanza:1');
    expect(relineUnit('stanza:1', moved)).toBeUndefined();
  });
});
