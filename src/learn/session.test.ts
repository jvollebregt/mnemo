import { describe, expect, it } from 'vitest';
import { linesOf, stanzasOf, stepAfter, type Step } from './session';

const poem = {
  stanzas: [
    { lines: [{ number: 1 }, { number: 2 }] },
    { lines: [{ number: 3 }, { number: 4 }] },
    { lines: [{ number: 5 }, { number: 6 }] },
  ],
};

describe('the order of practice', () => {
  it('learns each stanza, then its seam with the one before, then all of them so far', () => {
    const steps: Step[] = [{ kind: 'stanza', stanza: 0 }];
    for (let next = stepAfter(steps[0]!, 3); next; next = stepAfter(next, 3)) steps.push(next);
    expect(steps).toEqual([
      { kind: 'stanza', stanza: 0 },
      { kind: 'stanza', stanza: 1 },
      { kind: 'seam', stanza: 1 },
      { kind: 'chain', through: 1 },
      { kind: 'stanza', stanza: 2 },
      { kind: 'seam', stanza: 2 },
      { kind: 'chain', through: 2 },
    ]);
  });

  it('ends after a poem of one stanza', () => {
    expect(stepAfter({ kind: 'stanza', stanza: 0 }, 1)).toBeUndefined();
  });

  it('sets the lines of each step', () => {
    expect(linesOf({ kind: 'stanza', stanza: 1 }, poem)).toEqual([3, 4]);
    expect(linesOf({ kind: 'seam', stanza: 2 }, poem)).toEqual([4, 5]);
    expect(linesOf({ kind: 'chain', through: 1 }, poem)).toEqual([1, 2, 3, 4]);
    expect(stanzasOf({ kind: 'seam', stanza: 2 })).toEqual([1, 2]);
    expect(stanzasOf({ kind: 'chain', through: 2 })).toEqual([0, 1, 2]);
  });
});
