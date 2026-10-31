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

const NUMBERS: Record<string, readonly string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
  nl: ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf'],
};

/** Old contractions a poem prints and a recogniser writes out in full. */
const ELIDED: Record<string, string> = { oer: 'over', een: 'even', neer: 'never', eer: 'ever', eneath: 'beneath' };

/**
 * A word as it is heard rather than spelled, so that a recital isn't marked
 * wrong for a spelling: a recogniser writes "tiger" for Blake's "Tyger",
 * "color" for "colour", "learned" for "learn'd" and "4" for "four", and old
 * Dutch "zyn" and "visch" are today's "zijn" and "vis". Both the poem's words
 * and the reader's go through it, so it only ever lets two spellings of one
 * word meet.
 */
export function spokenKey(word: string, language = 'en'): string {
  const n = Number(word);
  let w = /^\d+$/.test(word) && NUMBERS[language]?.[n] ? NUMBERS[language][n] : word;
  if (language === 'en') {
    w = ELIDED[w] ?? w;
    w = w
      .replace(/^(.{3,})our(s?)$/, '$1or$2') // colour, honours
      .replace(/(.{2,})is(e|es|ed|ing)$/, '$1iz$2') // realise
      .replace(/([^aeiouy])re$/, '$1er') // centre, metre
      .replace(/(.{3,}[^e])ed$/, '$1d'); // learn'd, burned
  } else if (language === 'nl') {
    w = w
      .replace(/sch$/, 's') // visch, mensch
      .replace(/ae/g, 'aa') // Gezelle's spelling
      .replace(/ij/g, 'y');
  }
  return w
    .replace(/(.)y/g, '$1i') // tyger, zyn
    .replace(/([b-df-hj-np-tv-z])\1/g, '$1'); // travelled; doubled vowels stay, as Dutch maan and man differ
}

/** The words typed so far, as written. Until the reader is done, a word counts only once they have moved past it. */
export function typedPieces(typed: string, done: boolean): string[] {
  const pieces = typed.split(BETWEEN_WORDS);
  if (!done) pieces.pop();
  return pieces.filter((piece) => normalize(piece));
}

/** The words typed so far, as compared. */
export function typedWords(typed: string, done: boolean): string[] {
  return typedPieces(typed, done).map(normalize);
}

/**
 * How the reader's words line up with the poem's: the longest run of the
 * poem's words, in order, that also appears in order in what they said, as
 * pairs of [poem word, said word] by index.
 */
export function alignment(poemWords: readonly string[], said: readonly string[], language?: string): [number, number][] {
  const expected = poemWords.map((w) => spokenKey(w, language));
  const typed = said.map((w) => spokenKey(w, language));
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
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i] === typed[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (longest[i + 1]![j]! >= longest[i]![j + 1]!) i += 1;
    else j += 1;
  }
  return pairs;
}

/** Which of the poem's words (by index) the reader recalled. */
export function recalled(poemWords: readonly string[], said: readonly string[], language?: string): Set<number> {
  return new Set(alignment(poemWords, said, language).map(([i]) => i));
}

/**
 * The matched words that count as said where they stand: those in the line
 * the reader is on, or the next, and those further on only when three are
 * said in a row there. A stray word that happens to occur later in the poem
 * is never placed there, while a reader who really skips ahead is followed.
 * `lineOf` gives each poem word's line.
 */
export function placed(pairs: readonly [number, number][], lineOf: readonly number[]): [number, number][] {
  const kept: [number, number][] = [];
  let due = 0;
  pairs.forEach(([i, j], p) => {
    const near = (lineOf[i] ?? 0) <= (lineOf[due] ?? 0) + 1;
    const run = [1, 2].every((d) => pairs[p + d]?.[0] === i + d && pairs[p + d]?.[1] === j + d);
    if (!near && !run) return;
    kept.push([i, j]);
    due = i + 1;
  });
  return kept;
}

/**
 * The poem words to show in pencil as the reader goes: every word before the
 * last one said that wasn't said, and, when the reader has just said
 * something that doesn't fit, the word they were due to say. If they then say
 * it after all, it comes back in ink.
 */
export function gonePast(pairs: readonly [number, number][], said: number, words: number): Set<number> {
  const last = pairs.at(-1);
  const due = last ? last[0] + 1 : 0;
  const found = new Set(pairs.map(([i]) => i));
  const gone = new Set<number>();
  for (let i = 0; i < due; i += 1) if (!found.has(i)) gone.add(i);
  if (said > (last ? last[1] + 1 : 0) && due < words) gone.add(due);
  return gone;
}

/** What the reader said where a poem word was missed: the said words between the recalled ones on either side of it. */
export function saidInstead(pairs: readonly [number, number][], said: readonly string[], poemIndex: number): string[] {
  const before = pairs.filter(([i]) => i < poemIndex).at(-1);
  const after = pairs.find(([i]) => i > poemIndex);
  return said.slice(before ? before[1] + 1 : 0, after ? after[1] : said.length);
}

/**
 * Taking it again from a poem word: how many of the said words to keep. All
 * of them up to where the reader first got that word or one after it; any
 * words they said in place of a missed word before it stay, to be asked about.
 */
export function keptBefore(pairs: readonly [number, number][], said: number, poemIndex: number): number {
  return pairs.find(([i]) => i >= poemIndex)?.[1] ?? said;
}
