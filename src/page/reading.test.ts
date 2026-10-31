import { describe, expect, it } from 'vitest';
import { inHandAfter, stanzaAt, stillInView } from './reading';

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
  // Quatrains 160 high with 40 between them, on a working area from 0 to 1000: the band runs from the reading line at 400 down to 500.
  const at = (offset: number) => [0, 1, 2, 3, 4, 5].map((i) => ({ top: i * 200 - offset, bottom: i * 200 + 160 - offset }));
  const after = (offset: number, current: number, held = false) => inHandAfter(at(offset), current, 0, 1000, held);

  it('stays in hand while it crosses the band around the reading line', () => {
    expect(after(0, 2).index).toBe(2);
    // Scrolled down until its last line passes the reading line: the one across the line takes over.
    expect(after(150, 2).index).toBe(2);
    expect(after(190, 2).index).toBe(3);
    // Scrolled up, it stays until its first line has dropped below the band.
    expect(after(-90, 2).index).toBe(2);
    expect(after(-110, 2).index).toBe(1);
  });

  it('passes from each stanza to the next, scrolling down and back up, skipping none', () => {
    const walk = (from: number, to: number, current: number) => {
      const seen = [current];
      for (let offset = from; offset !== to; offset += Math.sign(to - from) * 10) {
        current = after(offset, current).index!;
        if (current !== seen.at(-1)) seen.push(current);
      }
      return seen;
    };
    expect(walk(0, 800, 2)).toEqual([2, 3, 4, 5]);
    expect(walk(800, 0, 5)).toEqual([5, 4, 3, 2]);
  });

  it('holds a stanza just tapped while it is on the screen, until it reaches the band', () => {
    // Stanza 4 sits low on the screen, below the band.
    expect(after(0, 4, true)).toEqual({ index: 4, held: true });
    expect(after(0, 4).index).toBe(2);
    expect(after(350, 4, true)).toEqual({ index: 4, held: false });
  });

  it('counts a stanza as on the screen while enough of it shows', () => {
    expect(stillInView({ top: -150, bottom: 110 }, 80, 700)).toBe(false);
    expect(stillInView({ top: -150, bottom: 150 }, 80, 700)).toBe(true);
    expect(stillInView({ top: 690, bottom: 730 }, 80, 700)).toBe(false);
  });
});
