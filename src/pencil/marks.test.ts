import { describe, expect, it } from 'vitest';
import {
  addEcho,
  echoAt,
  echoStyle,
  echoWords,
  emptyMarks,
  eraseEcho,
  familiesInUse,
  freshFamily,
  markedStanzaNear,
  readMarks,
  recut,
  rhymeLetters,
  setSplit,
  settle,
  toggleBeat,
  togglePause,
  type PoemMarks,
} from './marks';

describe('beats', () => {
  it('toggle on and off with a tap', () => {
    const once = toggleBeat(emptyMarks(), 1, 0);
    expect(once.beats).toEqual(['1:0']);
    expect(toggleBeat(once, 1, 0).beats).toEqual([]);
  });

  it('settle a line once, and it stays settled', () => {
    const settled = settle(settle(emptyMarks(), 2), 2);
    expect(settled.settled).toEqual([2]);
  });
});

describe('pauses', () => {
  it('toggle on punctuation or between words', () => {
    const m = togglePause(togglePause(emptyMarks(), 1, 34), 1, 12);
    expect(m.pauses).toEqual(['1:34', '1:12']);
    expect(togglePause(m, 1, 34).pauses).toEqual(['1:12']);
  });
});

describe('echoes', () => {
  it('are found by any letter they underline, and erased whole', () => {
    const m = addEcho(emptyMarks(), { family: 1, line: 3, start: 4, end: 9 });
    expect(echoAt(m, 3, 6)).toMatchObject({ start: 4, end: 9 });
    expect(echoAt(m, 3, 9)).toBeUndefined();
    expect(eraseEcho(m, echoAt(m, 3, 4)!).echoes).toEqual([]);
  });

  it('replace an echo they are drawn over, since a letter carries one underline', () => {
    let m = addEcho(emptyMarks(), { family: 1, line: 1, start: 0, end: 3 });
    m = addEcho(m, { family: 2, line: 1, start: 2, end: 5 });
    expect(m.echoes).toEqual([{ family: 2, line: 1, start: 2, end: 5 }]);
  });

  it('ignore an empty stroke', () => {
    expect(addEcho(emptyMarks(), { family: 1, line: 1, start: 4, end: 4 }).echoes).toEqual([]);
  });
});

describe('pens for the sounds', () => {
  const sounds = (count: number) =>
    Array.from({ length: count }, (_, i) => i + 1).reduce(
      (marks, family) => addEcho(marks, { family, line: family, start: 0, end: 2 }),
      emptyMarks(),
    );

  it('offer the first pen not in use, and list the ones in use in order', () => {
    const marks = addEcho(addEcho(emptyMarks(), { family: 3, line: 1, start: 0, end: 1 }), { family: 1, line: 2, start: 0, end: 1 });
    expect(familiesInUse(marks)).toEqual([1, 3]);
    expect(freshFamily(marks)).toBe(2);
    expect(freshFamily(emptyMarks())).toBe(1);
  });

  it('give each of the first ten sounds its own style for the whole poem', () => {
    const marks = sounds(10);
    expect(familiesInUse(marks).map((f) => echoStyle(marks, f))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(marks.styles).toEqual({});
  });

  it('lend an eleventh sound the style marked furthest from it, and take it back once it is rubbed out', () => {
    const marks = addEcho(sounds(10), { family: 11, line: 2, start: 3, end: 5 });
    // Sound 10 sits on line 10, the furthest from line 2.
    expect(echoStyle(marks, 11)).toBe(10);
    // Its style stays put as more is marked.
    expect(echoStyle(addEcho(marks, { family: 11, line: 11, start: 0, end: 1 }), 11)).toBe(10);
    const erased = eraseEcho(marks, marks.echoes.at(-1)!);
    expect(erased.styles).toEqual({});
  });

  it('read back the words that carry a sound, in order, each spelling once', () => {
    const text: Record<number, string> = { 1: 'Rome', 2: 'foam', 3: 'ROME', 4: 'comb' };
    let marks = emptyMarks();
    for (const line of [4, 1, 2, 3]) marks = addEcho(marks, { family: 1, line, start: 1, end: 3 });
    marks = addEcho(marks, { family: 2, line: 5, start: 0, end: 1 });
    expect(echoWords(marks, 1, (line) => text[line])).toEqual(['Rome', 'foam', 'comb']);
  });
});

describe('rhymeLetters', () => {
  // Dickinson's first stanza: lines end on feathers, soul, words, all.
  const ends = [
    { line: 1, start: 25, end: 33 },
    { line: 2, start: 19, end: 23 },
    { line: 3, start: 34, end: 39 },
    { line: 4, start: 23, end: 26 },
  ];
  const marked = (echoes: PoemMarks['echoes']): PoemMarks => ({ ...emptyMarks(), echoes });

  it('gives nothing until a family closes two lines', () => {
    expect(rhymeLetters(marked([{ family: 2, line: 2, start: 20, end: 23 }]), ends).size).toBe(0);
  });

  it('letters only the lines the reader marked, in order of appearance', () => {
    const letters = rhymeLetters(
      marked([
        { family: 2, line: 2, start: 20, end: 23 },
        { family: 2, line: 4, start: 24, end: 26 },
      ]),
      ends,
    );
    expect([...letters]).toEqual([
      [2, 'a'],
      [4, 'a'],
    ]);
  });

  it('ignores echoes that are not at the end of the line', () => {
    const letters = rhymeLetters(
      marked([
        { family: 1, line: 1, start: 0, end: 1 },
        { family: 1, line: 2, start: 0, end: 1 },
      ]),
      ends,
    );
    expect(letters.size).toBe(0);
  });
});

describe('recut', () => {
  it('keeps the reader\'s cut and drops beats that no longer start a syllable', () => {
    // "feathers" at offset 25 of line 1, guessed as feath|ers, re-cut as fea|thers.
    let m = toggleBeat(emptyMarks(), 1, 25);
    m = toggleBeat(m, 1, 30);
    m = toggleBeat(m, 2, 30);
    const next = recut(m, 1, { start: 25, end: 33 }, [3]);
    expect(next.splits).toEqual({ 1: { 25: [3] } });
    expect(next.beats).toEqual(['1:25', '2:30']);
  });
});

describe('stored marks', () => {
  it('keep the styles lent to sounds past the tenth, and read older marks without them', () => {
    const stored = JSON.stringify({ echoes: [{ family: 14, line: 1, start: 0, end: 1 }], styles: { 14: 7, 15: 99 } });
    expect(readMarks(stored).styles).toEqual({ 14: 7 });
    expect(readMarks(JSON.stringify({ echoes: [] })).styles).toEqual({});
  });

  it('round-trip through JSON', () => {
    let m = toggleBeat(emptyMarks(), 1, 1);
    m = setSplit(m, 1, 4, [5, 2]);
    m = addEcho(m, { family: 3, line: 2, start: 1, end: 2 });
    expect(readMarks(JSON.stringify(m))).toEqual({ ...m, splits: { 1: { 4: [2, 5] } } });
  });

  it('drop what is unreadable instead of failing', () => {
    expect(readMarks('not json')).toEqual(emptyMarks());
    expect(readMarks(undefined)).toEqual(emptyMarks());
    const partial = readMarks(JSON.stringify({ beats: ['1:0', 3], echoes: [{ family: 0, line: 1, start: 0, end: 1 }] }));
    expect(partial.beats).toEqual(['1:0']);
    expect(partial.echoes).toEqual([]);
  });
});

describe('the stanza to fade from the pencil', () => {
  const stanzas = [[1, 2], [3, 4], [5, 6], [7, 8]];
  it('is the one in hand when it has marks, else the nearest marked one above, else below', () => {
    const marks = { ...emptyMarks(), beats: ['3:0'], echoes: [{ family: 1 as const, line: 8, start: 0, end: 2 }] };
    expect(markedStanzaNear(1, stanzas, marks)).toBe(1);
    expect(markedStanzaNear(2, stanzas, marks)).toBe(1);
    expect(markedStanzaNear(0, stanzas, marks)).toBe(1);
    expect(markedStanzaNear(0, stanzas, emptyMarks())).toBe(0);
  });
});
