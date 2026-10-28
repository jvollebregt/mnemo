/**
 * A line of the poem as the pencil sees it: words cut into syllables, and the
 * spaces and punctuation between them. Every piece keeps its character offset
 * in the line, so marks can be stored against the text itself.
 */
import type { PoemLanguage } from '../poem/language';
import { cut, nuclei, syllableBreaks, type SyllableCounts } from './syllables';

export interface Syllable {
  text: string;
  /** Offset of its first character in the line. */
  start: number;
}

export type Token =
  | { kind: 'word'; text: string; start: number; syllables: Syllable[] }
  | { kind: 'space'; text: string; start: number }
  | { kind: 'punct'; text: string; start: number };

/** Letters, plus apostrophes inside a word (learn’d, o'er, ’t). */
const WORD = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|['’][\p{L}\p{M}]+/gu;

/** Where the reader has re-cut a word, by the word's offset in the line: break offsets within the word. */
export type Splits = Readonly<Record<number, readonly number[]>>;

export interface Syllabifier {
  language: PoemLanguage;
  counts?: SyllableCounts;
}

export function tokenize(line: string, syllabifier: Syllabifier, splits: Splits = {}): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  const between = (end: number) => {
    // Anything between words is spaces and punctuation, one token per run of each.
    const gap = line.slice(at, end);
    for (const run of gap.match(/\s+|[^\s]+/gu) ?? []) {
      tokens.push({ kind: /^\s/u.test(run) ? 'space' : 'punct', text: run, start: at });
      at += run.length;
    }
  };

  for (const match of line.matchAll(WORD)) {
    const start = match.index;
    between(start);
    const text = match[0];
    const letters = text.replace(/['’]/g, '');
    const breaks = splits[start] ?? mapBreaks(text, syllableBreaks(letters, syllabifier.language, syllabifier.counts));
    // A clipped word with no vowel (’t, ’s) leans on its neighbour and is no syllable of its own.
    const sounded = nuclei(letters.toLowerCase(), syllabifier.language).length > 0;
    tokens.push({
      kind: 'word',
      text,
      start,
      syllables: sounded
        ? cut(text, breaks).map((piece, k) => ({
            text: piece,
            start: start + [0, ...breaks][k]!,
          }))
        : [],
    });
    at = start + text.length;
  }
  between(line.length);
  return tokens;
}

/** Breaks found in the letters of a word, moved past any apostrophes in the word itself. */
function mapBreaks(word: string, letterBreaks: readonly number[]): number[] {
  const positions: number[] = [];
  for (let i = 0; i < word.length; i += 1) if (!/['’]/.test(word[i] ?? '')) positions.push(i);
  return letterBreaks.map((b) => positions[b] ?? word.length).filter((b) => b > 0 && b < word.length);
}

/** Every syllable in the line, in order. */
export function syllablesOf(tokens: readonly Token[]): Syllable[] {
  return tokens.flatMap((t) => (t.kind === 'word' ? t.syllables : []));
}

/** The word that ends the line, if any: the place where end rhyme lives. */
export function lastWord(tokens: readonly Token[]): Extract<Token, { kind: 'word' }> | undefined {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token?.kind === 'word') return token;
  }
  return undefined;
}
