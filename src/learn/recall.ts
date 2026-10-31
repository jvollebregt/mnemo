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

/** How close together recalled words must be to show how far the reader has got. */
const RUN = 3;

/**
 * How far into the poem the reader has got: just past the last word recalled
 * close after another, so that one stray word, matched far ahead, doesn't
 * make every word before it look missed. Words before this are behind them.
 */
export function reached(found: ReadonlySet<number>): number {
  const sorted = [...found].sort((a, b) => a - b);
  for (let k = sorted.length - 1; k > 0; k -= 1) {
    if (sorted[k]! - sorted[k - 1]! <= RUN) return sorted[k]! + 1;
  }
  return 0;
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
