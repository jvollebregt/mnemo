import { describe, expect, it } from 'vitest';
import { partsOf } from './parts';

const units = (...lines: number[]) => lines.map((n) => ({ lines: n, words: n * 7 }));

describe('parts', () => {
  it('learns a short poem whole, whatever its stanzas', () => {
    // Crane's "In the Desert": two stanzas of five short lines, one small story.
    expect(partsOf([{ lines: 5, words: 22 }, { lines: 5, words: 25 }])).toEqual([[0, 1]]);
    expect(partsOf([{ lines: 3, words: 17 }])).toEqual([[0]]);
  });

  it('keeps stanzas of four lines or more as they are', () => {
    expect(partsOf(units(4, 4, 4))).toEqual([[0], [1], [2]]);
    expect(partsOf(units(6, 8))).toEqual([[0], [1]]);
  });

  it('joins short stanzas until there are four lines or more', () => {
    expect(partsOf(units(2, 2, 2, 2, 2, 2, 2))).toEqual([[0, 1], [2, 3], [4, 5, 6]]);
    // A sonnet set 4 4 3 3.
    expect(partsOf(units(4, 4, 3, 3))).toEqual([[0], [1], [2, 3]]);
  });

  it('joins a short last stanza to the one before, but not past eight lines', () => {
    expect(partsOf(units(4, 4, 2))).toEqual([[0], [1, 2]]);
    expect(partsOf(units(4, 8, 2))).toEqual([[0], [1], [2]]);
  });

  it('never makes a part longer than eight lines by joining', () => {
    expect(partsOf(units(3, 6, 4))).toEqual([[0], [1], [2]]);
  });
});
