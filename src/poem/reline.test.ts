import { describe, expect, it } from 'vitest';
import { emptyMarks } from '../pencil/marks';
import { parsePoem } from './parse';
import { reline, relineMarks, relineUnit } from './reline';

// Stanzas of four long-enough lines each, so that each is learned as a part of its own.
const stanza = (name: string) => [1, 2, 3, 4].map((n) => `${name} line ${n} with words enough to count`).join('\n');
const BEFORE = `Hope is the thing\nthat perches in the soul\nand sings the tune\nwithout the words\n\n${stanza('second')}\n\n${stanza('third')}`;

describe('reline', () => {
  it('follows unchanged lines past a line added above them', () => {
    const after = BEFORE.replace('Hope is the thing', 'Hope is the thing with feathers').replace('second line 4 with words enough to count', 'second line 4 with words enough to count\nand never stops');
    const moved = reline(parsePoem(BEFORE), parsePoem(after));
    expect([...moved.lines].slice(0, 4)).toEqual([
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ]);
    expect(moved.lines.get(9)).toBe(10);
    // The first stanza had a line changed, the second gained one: neither carries over as a whole; the third does.
    expect([...moved.stanzas]).toEqual([[2, 2]]);
  });

  it('keeps a stanza that is word for word the same, wherever it moved', () => {
    const moved = reline(parsePoem(BEFORE), parsePoem(`${stanza('new')}\n\n${BEFORE}`));
    expect(moved.lines.get(1)).toBe(5);
    expect([...moved.stanzas]).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
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
    const moved = reline(parsePoem(BEFORE), parsePoem(`${stanza('new')}\n\n${BEFORE.replace('the words', 'a word')}`));
    expect(relineUnit('line:1', moved)).toBe('line:5');
    expect(relineUnit('line:4', moved)).toBeUndefined();
    expect(relineUnit('stanza:0', moved)).toBeUndefined();
    expect(relineUnit('stanza:1', moved)).toBe('stanza:2');
  });
});
