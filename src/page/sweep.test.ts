import { describe, expect, it } from 'vitest';
import { sweepTo, TURN, type Sweep } from './sweep';

const start: Sweep = { line: 1, at: 0, far: 0, dir: 0, show: true };

describe('a stroke along a line', () => {
  it('passes over everything between two places the finger was seen', () => {
    const moved = sweepTo(start, 20)!;
    expect([moved.from, moved.to, moved.show]).toEqual([0, 20, true]);
    expect(moved.next).toMatchObject({ at: 20, far: 20, dir: 1 });
  });

  it('ignores a little wobble back', () => {
    const on = sweepTo(start, 20)!.next;
    const wobble = sweepTo(on, 20 - (TURN - 1))!;
    expect(wobble.to).toBeLessThan(wobble.from);
    expect(wobble.next).toMatchObject({ far: 20, dir: 1, show: true });
    // Going on from there carries on showing.
    expect(sweepTo(wobble.next, 30)).toMatchObject({ from: 17, to: 30, show: true });
  });

  it('turning back undoes what it passes over, from the furthest point', () => {
    const on = sweepTo(start, 20)!.next;
    const back = sweepTo(on, 12)!;
    expect([back.from, back.to, back.show]).toEqual([12, 20, false]);
    expect(back.next).toMatchObject({ dir: -1, show: false });
    // And turning again brings words back.
    expect(sweepTo(sweepTo(back.next, 5)!.next, 15)).toMatchObject({ show: true, from: 5, to: 15 });
  });
});
