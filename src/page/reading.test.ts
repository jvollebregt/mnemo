import { describe, expect, it } from 'vitest';
import { stanzaAt } from './reading';

const boxes = [
  { top: 100, bottom: 200 },
  { top: 240, bottom: 340 },
  { top: 380, bottom: 480 },
];

describe('the stanza at the reading line', () => {
  it('is the one across the line', () => {
    expect(stanzaAt(boxes, 300)).toBe(1);
  });

  it('is the nearest one when the line falls between stanzas or past them all', () => {
    expect(stanzaAt(boxes, 215)).toBe(0);
    expect(stanzaAt(boxes, 230)).toBe(1);
    expect(stanzaAt(boxes, 900)).toBe(2);
    expect(stanzaAt([], 300)).toBeUndefined();
  });
});
