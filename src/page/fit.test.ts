import { describe, expect, it } from 'vitest';
import { fitSize, hasTurnovers, lineLabel, roman } from './fit';

describe('fitSize', () => {
  it('uses the largest size when every line fits', () => {
    expect(fitSize({ widths: [100, 120, 90], referenceSize: 20, measure: 300 })).toBe(20);
  });

  it('shrinks until most lines fit', () => {
    // At 20px the long line is 400 wide; at 15px it is 300.
    expect(fitSize({ widths: [400], referenceSize: 20, measure: 330 })).toBe(16.5);
  });

  it('lets a few long lines turn over rather than shrinking the whole poem', () => {
    const widths = [...Array(19).fill(200), 900];
    expect(fitSize({ widths, referenceSize: 20, measure: 300 })).toBe(20);
  });

  it('never goes below the smallest size; the rest turn over', () => {
    const whitman = [500, 900, 1000, 1300, 700, 750, 760, 600];
    expect(fitSize({ widths: whitman, referenceSize: 20, measure: 330 })).toBe(15);
  });

  it('copes with an empty poem or no measure yet', () => {
    expect(fitSize({ widths: [], referenceSize: 20, measure: 300 })).toBe(20);
    expect(fitSize({ widths: [100], referenceSize: 20, measure: 0 })).toBe(20);
  });
});

describe('hasTurnovers', () => {
  it('says whether a line still overflows at the chosen size', () => {
    const fit = { widths: [200, 500], referenceSize: 20, measure: 330 };
    expect(hasTurnovers(fit, 15)).toBe(true);
    expect(hasTurnovers({ ...fit, measure: 400 }, 15)).toBe(false);
    expect(hasTurnovers({ ...fit, measure: 0 }, 15)).toBe(false);
  });
});

describe('lineLabel', () => {
  it('numbers every fifth line', () => {
    expect([1, 4, 5, 9, 10, 15].map(lineLabel)).toEqual(['', '', '5', '', '10', '15']);
  });
});

describe('roman', () => {
  it('numbers stanzas as a book does', () => {
    expect([1, 2, 3, 4, 9, 14, 40].map(roman)).toEqual(['i', 'ii', 'iii', 'iv', 'ix', 'xiv', 'xl']);
  });
});
