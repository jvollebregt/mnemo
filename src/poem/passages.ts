/**
 * A long run of lines with no stanza breaks (a speech from a play, a sonnet
 * set as one block, blank verse) is too much to learn in one go. It is cut
 * into passages of a few lines, where the poet's sentences end, and each
 * passage is learned as a stanza is. The page keeps the poet's layout: no
 * blank line is added between passages.
 */

/** A stanza up to this long is learned whole. */
export const LONGEST_PASSAGE = 8;
const SHORTEST_PASSAGE = 4;
const BEST_PASSAGE = 6;
/** How much a weaker ending weighs against a passage's distance from six lines. */
const CUT_WEIGHT = 3;

/** How firmly a line closes: a full stop or question beats a semicolon, which beats a comma or dash. */
export function closure(line: string): number {
  // Closing quotes and brackets after the punctuation don't change how the line ends.
  const end = line.replace(/[\s"'’”»)\]]+$/u, '');
  if (/[.!?…]$/u.test(end)) return 3;
  if (/[;:]$/u.test(end)) return 2;
  if (/[,\-–—]$/u.test(end)) return 1;
  return 0;
}

/**
 * Cuts a stanza's lines into passages of four to eight lines. Of all the ways
 * to cut it, the one chosen cuts where sentences end, makes passages of about
 * six lines, and cuts no more than it must. A stanza of eight lines or fewer
 * stays whole.
 */
export function passagesOf<T extends { text: string }>(lines: readonly T[]): T[][] {
  const n = lines.length;
  if (n <= LONGEST_PASSAGE) return n === 0 ? [] : [lines.slice()];
  // cost[i]: the least cost of cutting the first i lines; from[i]: where its last passage starts.
  const cost: number[] = [0];
  const from: number[] = [0];
  for (let i = 1; i <= n; i += 1) {
    cost[i] = Infinity;
    for (let size = SHORTEST_PASSAGE; size <= LONGEST_PASSAGE && size <= i; size += 1) {
      const j = i - size;
      // A cut after a full stop costs nothing; after a semicolon, a comma or no stop at all, more and more.
      const cut = j === 0 ? 0 : (3 - closure(lines[j - 1]!.text)) * CUT_WEIGHT;
      const total = cost[j]! + cut + Math.abs(size - BEST_PASSAGE);
      if (total < cost[i]!) {
        cost[i] = total;
        from[i] = j;
      }
    }
  }
  const passages: T[][] = [];
  for (let i = n; i > 0; i = from[i]!) passages.unshift(lines.slice(from[i], i));
  return passages;
}
