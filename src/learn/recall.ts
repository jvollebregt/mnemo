/**
 * Checking a recital against the poem. The reader says or types the
 * stanza from memory; their words are lined up with the poem's in order, so
 * a skipped line or an extra word doesn't throw the rest off. Case, accents
 * and punctuation don't count: only the words do.
 */

/** Anything that isn't part of a word: spaces, punctuation, dashes. Apostrophes stay inside words (learn’d, ’t). */
const BETWEEN_WORDS = /[^\p{L}\p{M}\p{N}'’]+/u;

/** A word as it is compared: lower case, without accents or apostrophes. */
export function normalize(word: string): string {
  return word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** The words typed so far. Until the reader is done, a word counts only once they have moved past it. */
export function typedWords(typed: string, done: boolean): string[] {
  const pieces = typed.split(BETWEEN_WORDS);
  if (!done) pieces.pop();
  return pieces.map(normalize).filter(Boolean);
}

/**
 * Which of the poem's words (by index) the reader recalled: the longest run
 * of them, in order, that also appears in order in what they typed.
 */
export function recalled(expected: readonly string[], typed: readonly string[]): Set<number> {
  const n = expected.length;
  const m = typed.length;
  // longest[i][j]: the most words matched between expected[i..] and typed[j..].
  const longest = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      longest[i]![j] =
        expected[i] === typed[j] ? longest[i + 1]![j + 1]! + 1 : Math.max(longest[i + 1]![j]!, longest[i]![j + 1]!);
    }
  }
  const found = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i] === typed[j]) {
      found.add(i);
      i += 1;
      j += 1;
    } else if (longest[i + 1]![j]! >= longest[i]![j + 1]!) i += 1;
    else j += 1;
  }
  return found;
}
