/**
 * Choosing the type size for a poem.
 *
 * A poem is set once, at the largest size where most of its lines fit the
 * measure. Lines that still don't fit turn over with a hanging indent, the way
 * a printed book sets them, and stay one line. Text width grows in proportion
 * to type size, so every line is measured once at a reference size.
 */

export interface FitOptions {
  /** Width of each of the poet's lines, set at `referenceSize`. */
  widths: readonly number[];
  referenceSize: number;
  /** Width available for a line, in the same units. */
  measure: number;
  /** Largest and smallest type sizes, in px. */
  largest?: number;
  smallest?: number;
  /** Share of lines that must fit for a size to count as fitting "most lines". */
  share?: number;
  /** Size steps, in px. */
  step?: number;
}

export const DEFAULT_FIT = { largest: 20, smallest: 15, share: 0.9, step: 0.5 } as const;

export function fitSize({
  widths,
  referenceSize,
  measure,
  largest = DEFAULT_FIT.largest,
  smallest = DEFAULT_FIT.smallest,
  share = DEFAULT_FIT.share,
  step = DEFAULT_FIT.step,
}: FitOptions): number {
  if (widths.length === 0 || measure <= 0) return largest;
  const needed = Math.ceil(widths.length * share);
  for (let size = largest; size >= smallest; size -= step) {
    const scale = size / referenceSize;
    const fitting = widths.filter((w) => w * scale <= measure).length;
    if (fitting >= needed) return size;
  }
  return smallest;
}

/** Whether any line is still too long at `size` and must turn over. */
export function hasTurnovers({ widths, referenceSize, measure }: Pick<FitOptions, 'widths' | 'referenceSize' | 'measure'>, size: number): boolean {
  if (measure <= 0) return false;
  return widths.some((w) => (w * size) / referenceSize > measure);
}

/** The proof of a new poem numbers every fifth line, counting only the poet's lines. */
export function lineLabel(number: number): string {
  return number % 5 === 0 ? String(number) : '';
}

/** Stanzas are numbered in lower-case roman numerals at the foot of the page, as a book numbers its sections. */
export function roman(n: number): string {
  const numerals: [number, string][] = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
    [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let out = '';
  for (const [value, numeral] of numerals) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}
