import { describe, expect, it } from 'vitest';
import { stanzaAt, stillInView } from './reading';

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

describe('the stanza in hand', () => {
  it('stays in hand while enough of it is on the screen', () => {
    expect(stillInView({ top: 100, bottom: 300 }, 80, 700)).toBe(true);
    // Scrolled up until only a sliver shows: it lets go.
    expect(stillInView({ top: -150, bottom: 110 }, 80, 700)).toBe(false);
    expect(stillInView({ top: -150, bottom: 150 }, 80, 700)).toBe(true);
    // A short stanza must show whole.
    expect(stillInView({ top: 660, bottom: 700 }, 80, 700)).toBe(true);
    expect(stillInView({ top: 690, bottom: 730 }, 80, 700)).toBe(false);
  });
});
