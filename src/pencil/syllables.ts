/**
 * Splitting a word into syllables, so a beat can be marked on each one.
 *
 * No splitter is perfect, so this only has to be good enough to start from:
 * the reader can fix any word with a long press. For English, hyphenation
 * patterns give the places a printer would break, and the CMU pronouncing
 * dictionary says how many syllables the word has, so missing breaks are
 * added (as|tro|no|mer) and extra ones dropped. For Dutch, the hyphenation
 * patterns and the vowel groups do the same job without a dictionary.
 */
import { hyphenateSync as hyphenateEn } from 'hyphen/en-us';
import { hyphenateSync as hyphenateNl } from 'hyphen/nl';
import type { PoemLanguage } from '../poem/language';

/** Syllable counts by word, from a pronouncing dictionary. */
export type SyllableCounts = (word: string) => number | undefined;

const MARK = '|';

/** Vowel groups that make one sound in Dutch, longest first. */
const DUTCH_GROUPS = ['ieu', 'eeu', 'ooi', 'aai', 'oei', 'aa', 'ee', 'oo', 'uu', 'ie', 'oe', 'eu', 'ei', 'ij', 'ui', 'ou', 'au'];

const VOWEL = /[aeiouyàáâäèéêëìíîïòóôöùúûü]/;

/** Consonant pairs that start a syllable together, so a break goes before them. */
const ONSETS = new Set(['bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'ph', 'pl', 'pr', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'th', 'tr', 'tw', 'wh', 'wr']);

interface Nucleus {
  start: number;
  end: number;
}

/** Where the vowel sounds are. Letters only; the word is lower case. */
export function nuclei(word: string, language: PoemLanguage): Nucleus[] {
  const found: Nucleus[] = [];
  let i = 0;
  while (i < word.length) {
    const ch = word[i] ?? '';
    // y is a consonant at the start of a word or before a vowel (yes, beyond), a vowel elsewhere (every, rhythm).
    const vowel = ch === 'y' ? i > 0 && !VOWEL.test(word[i + 1] ?? '') : VOWEL.test(ch);
    if (!vowel) {
      i += 1;
      continue;
    }
    let end = i + 1;
    if (language === 'nl') {
      const group = DUTCH_GROUPS.find((g) => word.startsWith(g, i));
      if (group) end = i + group.length;
    } else {
      while (end < word.length && VOWEL.test(word[end] ?? '') && word[end] !== 'y') end += 1;
    }
    found.push({ start: i, end });
    i = end;
  }
  if (language === 'en') return dropSilentE(word, found);
  return found;
}

/** English final -e is usually silent (stone, heave), but not in -le after a consonant (little). */
function dropSilentE(word: string, found: Nucleus[]): Nucleus[] {
  const last = found[found.length - 1];
  if (!last || found.length < 2 || last.start !== word.length - 1 || word[last.start] !== 'e') return found;
  const before = word[last.start - 1] ?? '';
  const twoBefore = word[last.start - 2] ?? '';
  if (before === 'l' && twoBefore && !VOWEL.test(twoBefore)) return found;
  return found.slice(0, -1);
}

/** A break between each pair of vowel sounds, placed by the usual rules for the consonants between. */
function vowelBreaks(word: string, found: Nucleus[]): number[] {
  const breaks: number[] = [];
  for (let k = 1; k < found.length; k += 1) {
    const left = found[k - 1];
    const right = found[k];
    if (!left || !right) continue;
    const between = word.slice(left.end, right.start);
    if (between.length === 0) breaks.push(right.start);
    else if (between.length === 1) breaks.push(left.end);
    else if (ONSETS.has(between.slice(-2)) && between.length > 2) breaks.push(right.start - 2);
    // Two consonants that start a syllable together go with the vowel after them (a|ble, se|cret),
    // except s and another, which a voice usually parts (mis|take, whis|per).
    else if (between.length === 2 && ONSETS.has(between) && between[0] !== 's') breaks.push(right.start - 2);
    else if (between === 'ck' || between === 'ng' || between === 'ch' || between === 'th' || between === 'sh') {
      breaks.push(right.start);
    } else breaks.push(right.start - 1);
  }
  return breaks;
}

function patternBreaks(word: string, language: PoemLanguage): number[] {
  const hyphenate = language === 'nl' ? hyphenateNl : hyphenateEn;
  const marked = hyphenate(word, { hyphenChar: MARK, minWordLength: 3 });
  const breaks: number[] = [];
  let at = 0;
  for (const ch of marked) {
    if (ch === MARK) breaks.push(at);
    else at += 1;
  }
  return breaks;
}

/**
 * Each piece must keep a vowel. A printer's break may fall inside a group of
 * vowels (di|a|grams), so for those any vowel letter will do; a break of our
 * own must leave a whole vowel sound on each side.
 */
function everyPieceSounds(breaks: readonly number[], found: readonly Nucleus[], word: string, anyVowel = false): boolean {
  const edges = [0, ...breaks, word.length];
  for (let k = 1; k < edges.length; k += 1) {
    const from = edges[k - 1] ?? 0;
    const to = edges[k] ?? word.length;
    const sounds = anyVowel
      ? found.some((n) => n.start < to && n.end > from)
      : found.some((n) => n.start >= from && n.start < to);
    if (!sounds) return false;
  }
  return true;
}

/**
 * Break positions (letter offsets) in a word of letters, for the given
 * language. A single-syllable word has none.
 */
export function syllableBreaks(word: string, language: PoemLanguage, counts?: SyllableCounts): number[] {
  const lower = word.toLowerCase();
  const found = nuclei(lower, language);
  if (found.length < 2 && !counts) return [];
  const target = Math.max(1, (language === 'en' ? counts?.(lower) : undefined) ?? found.length);

  // Keep the printer's breaks that leave a vowel sound in every piece.
  let breaks: number[] = [];
  for (const b of patternBreaks(lower, language)) {
    if (b > 0 && b < lower.length && everyPieceSounds([...breaks, b], found, lower, true)) breaks.push(b);
  }

  // Too few: add vowel-group breaks where a piece still holds two vowel sounds.
  // When the dictionary hears fewer sounds than there are vowels, a lone e in
  // the middle usually goes unsounded (ev'ning), so the cuts go around the rest.
  const sounded = language === 'en' && found.length > target ? dropUnsoundedE(lower, found, found.length - target) : found;
  for (const b of vowelBreaks(lower, sounded)) {
    if (breaks.length >= target - 1) break;
    if (breaks.includes(b)) continue;
    const next = [...breaks, b].sort((x, y) => x - y);
    if (everyPieceSounds(next, sounded, lower)) breaks = next;
  }
  // Too many: the dictionary hears fewer syllables, so drop breaks from the end.
  while (breaks.length > target - 1) breaks = breaks.slice(0, -1);
  return breaks;
}

/** Drops up to `count` lone e's, never the first or last vowel sound. */
function dropUnsoundedE(word: string, found: readonly Nucleus[], count: number): Nucleus[] {
  const kept = [...found];
  for (let k = 1; k < kept.length - 1 && count > 0; k += 1) {
    const n = kept[k]!;
    if (word.slice(n.start, n.end) === 'e') {
      kept.splice(k, 1);
      k -= 1;
      count -= 1;
    }
  }
  return kept;
}

/** The word cut at the given breaks. */
export function cut(word: string, breaks: readonly number[]): string[] {
  const edges = [0, ...breaks, word.length];
  return edges.slice(1).map((end, k) => word.slice(edges[k], end));
}

/** Syllable counts from the CMU pronouncing dictionary, loaded on first use (it is large). */
export async function loadEnglishCounts(): Promise<SyllableCounts> {
  const { dictionary } = await import('cmu-pronouncing-dictionary');
  return (word) => {
    const pronunciation = dictionary[word.replace(/’/g, "'")];
    return pronunciation ? (pronunciation.match(/\d/g) ?? []).length || undefined : undefined;
  };
}
