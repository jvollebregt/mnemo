import { describe, expect, it } from 'vitest';
import { letterNear, type LetterBox, type LineBoxes } from './reach';

/** A row of letters 10 wide, with their tops at `top` and 20 tall. */
const row = (top: number, first: number, count: number, left = 0): LetterBox[] =>
  Array.from({ length: count }, (_, i) => ({ at: first + i, left: left + i * 10, right: left + (i + 1) * 10, top, bottom: top + 20 }));

// Two lines 30 apart: the first from 100 to 120, the second from 130 to 150.
const lines: LineBoxes[] = [
  { line: 1, letters: row(100, 0, 5) },
  { line: 2, letters: row(130, 0, 8) },
];
const reach = { above: 15, beside: 12 };

describe('letterNear', () => {
  it('takes a tap on a letter as that letter', () => {
    expect(letterNear(lines, 25, 110, reach)).toEqual({ line: 1, at: 2 });
  });

  it('gives the space above a line to that line, where its beats stand', () => {
    expect(letterNear(lines, 25, 90, reach)).toEqual({ line: 1, at: 2 });
    expect(letterNear(lines, 45, 125, reach)).toEqual({ line: 2, at: 4 });
  });

  it('lets a tap far above the lines in hand settle', () => {
    expect(letterNear(lines, 25, 80, reach)).toBeUndefined();
  });

  it('lets a tap below the last line settle', () => {
    expect(letterNear(lines, 25, 160, reach)).toBeUndefined();
  });

  it('goes to the nearest letter just past the end of a line, but not far past it', () => {
    expect(letterNear(lines, 58, 110, reach)).toEqual({ line: 1, at: 4 });
    expect(letterNear(lines, 70, 110, reach)).toBeUndefined();
  });

  it('finds the row of a line that turns over', () => {
    const turning: LineBoxes[] = [{ line: 1, letters: [...row(100, 0, 5), ...row(130, 5, 3, 30)] }];
    expect(letterNear(turning, 5, 110, reach)).toEqual({ line: 1, at: 0 });
    // Between the rows, the space belongs to the turnover, whose beats stand there.
    expect(letterNear(turning, 45, 125, reach)).toEqual({ line: 1, at: 6 });
  });

  it('skips a line with no letters', () => {
    expect(letterNear([{ line: 0, letters: [] }, ...lines], 25, 90, reach)).toEqual({ line: 1, at: 2 });
  });
});
