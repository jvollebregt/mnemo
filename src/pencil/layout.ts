/**
 * How a marked line is set on the page: the line's tokens cut into pieces
 * (syllables, spaces, punctuation), each carrying the reader's marks, down to
 * the single letters an echo underlines. The page renders this as it is.
 */
import { lookOf, type Look, type Stage } from '../learn/stages';
import { echoAt, echoStyle, markKey, type EchoFamily, type EchoStyle, type PoemMarks } from './marks';
import type { Token } from './tokens';

const LETTER = /[\p{L}\p{M}]/u;
export const isLetter = (ch: string) => LETTER.test(ch);

export interface Glyph {
  /** Offset in the line. */
  at: number;
  ch: string;
}

/** Neighbouring letters set alike: underlined in one family's style, or not at all. */
export interface Run {
  echo?: EchoFamily;
  style?: EchoStyle;
  /** Part of the stroke the reader is drawing right now. */
  preview?: boolean;
  /** Faded, or peeked at; in ink when absent. */
  look?: Exclude<Look, 'ink'>;
  glyphs: Glyph[];
}

export interface Piece {
  /** `end`: the end of a line with no punctuation, where a pause can still be heard. */
  kind: Token['kind'] | 'syllable' | 'end';
  start: number;
  /** Above a syllable: a beat, or the light mark of a settled line. */
  mark?: 'beat' | 'light';
  /** The syllable's vowel, which the mark stands over: its offsets in the line. */
  vowel?: { start: number; end: number };
  /** On punctuation or a space: the reader hears a pause here. */
  pause?: boolean;
  runs: Run[];
}

export interface Stroke {
  family: EchoFamily;
  start: number;
  end: number;
}

/** Where in the method the stanza is, and which words the reader has peeked at (by the offset of the word). */
export interface Fade {
  stage: Stage;
  peeked: ReadonlySet<number>;
  /** At the recital: the words recalled so far, and those gone past without being said (by offset), and whether the reader is done. */
  recalled?: ReadonlySet<number>;
  passed?: ReadonlySet<number>;
  done?: boolean;
}

interface Context {
  word?: Extract<Token, { kind: 'word' }>;
  /** Punctuation: the word it goes with, so that at the recital it comes back with that word. */
  owner?: Extract<Token, { kind: 'word' }>;
  pause?: boolean;
}

/**
 * The word a piece of punctuation goes with: an opening quote or bracket
 * with the word it opens, anything else with the word before it.
 */
function ownerOf(tokens: readonly Token[], index: number): Extract<Token, { kind: 'word' }> | undefined {
  const after = tokens[index + 1];
  const opens = after?.kind === 'word' && tokens[index - 1]?.kind !== 'word';
  const before = tokens.slice(0, index).reverse().find((t) => t.kind === 'word');
  const next = tokens.slice(index + 1).find((t) => t.kind === 'word');
  const owner = opens ? after : (before ?? next);
  return owner?.kind === 'word' ? owner : undefined;
}

export function layoutLine(
  tokens: readonly Token[],
  marks: PoemMarks,
  line: number,
  stroke?: Stroke,
  fade?: Fade,
): Piece[] {
  const syllableStarts = tokens.flatMap((t) => (t.kind === 'word' ? t.syllables.map((s) => s.start) : []));
  const hasBeat = syllableStarts.some((at) => marks.beats.includes(markKey(line, at)));
  // A settled line shows a light mark on every unmarked syllable, once it has a beat to count from.
  const light = hasBeat && marks.settled.includes(line);

  const runsOf = (text: string, start: number, context: Context = {}): Run[] => {
    const { word, owner, pause } = context;
    // A letter comes back with its own word; punctuation with the word it goes with, or, alone on a line, once done.
    const said = word ?? owner;
    const firstLetter = word ? word.start + [...word.text].findIndex(isLetter) : -1;
    const runs: Run[] = [];
    let at = start;
    for (const ch of text) {
      const letter = isLetter(ch);
      const preview = letter && !!stroke && at >= stroke.start && at < stroke.end;
      const echo = !letter ? undefined : preview ? stroke.family : echoAt(marks, line, at)?.family;
      // A space has no shape to trace: the gaps between the traces are what show the words.
      const seen = fade && !/\s/u.test(ch)
        ? lookOf(
            fade.stage,
            {
              letter,
              first: at === firstLetter,
              peeked: !!word && fade.peeked.has(word.start),
              recalled: said ? !!fade.recalled?.has(said.start) : !letter && !!fade.done,
              passed: !!said && !!fade.passed?.has(said.start),
              pause,
            },
            fade.done,
          )
        : 'ink';
      const look = seen === 'ink' ? undefined : seen;
      const last = runs[runs.length - 1];
      if (last && last.echo === echo && !!last.preview === preview && last.look === look) last.glyphs.push({ at, ch });
      else
        runs.push({
          ...(echo ? { echo, style: echoStyle(marks, echo) } : {}),
          ...(preview ? { preview } : {}),
          ...(look ? { look } : {}),
          glyphs: [{ at, ch }],
        });
      at += ch.length;
    }
    return runs;
  };

  const end = lineEnd(tokens);
  const endPause: Piece[] = marks.pauses.includes(markKey(line, end)) ? [{ kind: 'end', start: end, pause: true, runs: [] }] : [];

  return tokens.flatMap((token, index): Piece[] => {
    if (token.kind !== 'word') {
      const pause = marks.pauses.includes(markKey(line, token.start));
      const owner = token.kind === 'punct' ? ownerOf(tokens, index) : undefined;
      return [
        {
          kind: token.kind,
          start: token.start,
          ...(pause ? { pause } : {}),
          runs: runsOf(token.text, token.start, { pause, ...(owner ? { owner } : {}) }),
        },
      ];
    }
    if (token.syllables.length === 0) {
      return [{ kind: 'word', start: token.start, runs: runsOf(token.text, token.start, { word: token }) }];
    }
    return token.syllables.map((s) => {
      const beat = marks.beats.includes(markKey(line, s.start));
      const mark = beat ? 'beat' : light ? 'light' : undefined;
      const vowel = mark ? vowelOf(s.text, s.start) : undefined;
      return {
        kind: 'syllable',
        start: s.start,
        ...(mark ? { mark } : {}),
        ...(vowel ? { vowel } : {}),
        runs: runsOf(s.text, s.start, { word: token }),
      };
    });
  }).concat(endPause);
}

const VOWEL = /[aeiouàáâäèéêëìíîïòóôöùúûü]/iu;
// A y before a vowel (yes, beyond) is a consonant; elsewhere (day, rhythm) it is a vowel.
const isVowel = (text: string, i: number) =>
  VOWEL.test(text[i] ?? '') || (/y/iu.test(text[i] ?? '') && !VOWEL.test(text[i + 1] ?? ''));

/** Where a syllable's vowel sound is, so a mark can stand over it rather than over the whole syllable. */
function vowelOf(text: string, start: number): { start: number; end: number } | undefined {
  let from = 0;
  while (from < text.length && !isVowel(text, from)) from += 1;
  if (from === text.length) return undefined;
  let to = from + 1;
  while (to < text.length && isVowel(text, to)) to += 1;
  return { start: start + from, end: start + to };
}

/** The offset just after a line's last character. */
const lineEnd = (tokens: readonly Token[]) => tokens.reduce((end, t) => Math.max(end, t.start + t.text.length), 0);

/** The token holding the character at `at`. */
export function tokenAt(tokens: readonly Token[], at: number): Token | undefined {
  return tokens.find((t) => at >= t.start && at < t.start + t.text.length);
}

/** The syllable holding the character at `at`, as the offset of its first letter. */
export function syllableAt(tokens: readonly Token[], at: number): number | undefined {
  const token = tokenAt(tokens, at);
  if (token?.kind !== 'word') return undefined;
  return [...token.syllables].reverse().find((s) => s.start <= at)?.start;
}

/**
 * Where a pause goes when the reader taps a word rather than the narrow
 * space after it: on the punctuation that follows the word, or else on the
 * space before the next word, or at the very end of the line.
 */
export function pauseAfter(tokens: readonly Token[], at: number): number | undefined {
  const index = tokens.findIndex((t) => at >= t.start && at < t.start + t.text.length);
  if (index < 0) return undefined;
  if (tokens[index]?.kind !== 'word') return tokens[index]?.start;
  const next = tokens.slice(index + 1);
  const nextWord = next.findIndex((t) => t.kind === 'word');
  const between = nextWord < 0 ? next : next.slice(0, nextWord);
  const punct = between.find((t) => t.kind === 'punct');
  if (punct) return punct.start;
  return nextWord < 0 ? lineEnd(tokens) : between.find((t) => t.kind === 'space')?.start;
}

/** A stroke from one letter to another, in either direction, trimmed to start and end on a letter. */
export function strokeRange(text: string, from: number, to: number): { start: number; end: number } | undefined {
  let start = Math.min(from, to);
  let end = Math.max(from, to) + 1;
  while (start < end && !isLetter(text[start] ?? '')) start += 1;
  while (end > start && !isLetter(text[end - 1] ?? '')) end -= 1;
  return end > start ? { start, end } : undefined;
}
