/**
 * Reading a pasted poem: guessing its title, poet and language, and helping
 * the reader mend lines that the source page broke.
 *
 * Everything here only suggests. The reader confirms the title, can change the
 * language, and joins broken lines themselves: the app never rewrites a poem.
 */
import type { PoemLanguage } from './language';
import { LINE_BREAK } from './parse';

export interface Pasted {
  title: string;
  poet: string;
  /** The poem's own lines, blank lines between stanzas kept. */
  lines: string[];
}

const BYLINE = /^by\s+(.+)$/iu;

const isBlank = (line: string) => line.trim() === '';

function dropLeadingBlanks(lines: string[]): string[] {
  const first = lines.findIndex((l) => !isBlank(l));
  return first === -1 ? [] : lines.slice(first);
}

function dropTrailingBlanks(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && isBlank(lines[end - 1] ?? '')) end -= 1;
  return lines.slice(0, end);
}

/** "WALT WHITMAN" → "Walt Whitman". Names already in mixed case are left alone. */
export function nameCase(text: string): string {
  if (text !== text.toUpperCase() || text === text.toLowerCase()) return text;
  return text.toLowerCase().replace(/(^|[\s\-’'])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}

/**
 * Splits pasted text into a guessed title and poet and the poem's lines.
 *
 * A first line counts as the title when a blank line or a byline follows it.
 * A line starting with "by" (or Dutch "door") right after it counts as the poet.
 */
export function readPasted(text: string, withTitle = true): Pasted {
  let lines = dropLeadingBlanks(text.split(LINE_BREAK).map((l) => l.replace(/\s+$/u, '')));
  let title = '';
  let poet = '';
  if (!withTitle) return { title, poet, lines: dropTrailingBlanks(lines) };

  const first = lines[0];
  const second = lines[1];
  if (first !== undefined && second !== undefined && lines.length > 2 && (isBlank(second) || isByline(second))) {
    title = nameCase(first.trim());
    lines = dropLeadingBlanks(lines.slice(1));
  }

  const byline = title ? lines[0]?.trim().match(BYLINE) ?? lines[0]?.trim().match(/^door\s+(.+)$/iu) : null;
  if (byline?.[1]) {
    poet = nameCase(byline[1].trim());
    lines = dropLeadingBlanks(lines.slice(1));
  }

  return { title, poet, lines: dropTrailingBlanks(lines) };
}

function isByline(line: string): boolean {
  return BYLINE.test(line.trim()) || /^door\s+\S/iu.test(line.trim());
}

const ENDS_IN_PUNCTUATION = /[.,;:!?—–\-)\]”’"'…]$/u;

/**
 * Lines that look as if the source page broke them: they start in lower case
 * and the line above has no punctuation at its end. Modern poems often do
 * this on purpose, so these are only marked for the reader, never joined.
 */
export function suspectBreaks(lines: readonly string[]): number[] {
  const suspects: number[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const above = lines[i - 1] ?? '';
    if (isBlank(line) || isBlank(above)) continue;
    if (/^\p{Ll}/u.test(line.trim()) && !ENDS_IN_PUNCTUATION.test(above.trim())) suspects.push(i);
  }
  return suspects;
}

/** Whether a line can be joined to the one above it (it isn't the first line of a stanza). */
export function canJoin(lines: readonly string[], index: number): boolean {
  const line = lines[index];
  const above = lines[index - 1];
  return line !== undefined && above !== undefined && !isBlank(line) && !isBlank(above);
}

/**
 * The poem's text with the given lines joined to the line above them.
 * Stanzas stay separated by exactly one blank line.
 */
export function mend(lines: readonly string[], joins: ReadonlySet<number>): string {
  const out: string[] = [];
  let blank = false;
  lines.forEach((line, i) => {
    if (isBlank(line)) {
      blank = out.length > 0;
      return;
    }
    if (blank) out.push('');
    blank = false;
    const last = out.length - 1;
    if (joins.has(i) && canJoin(lines, i) && last >= 0) {
      out[last] = `${out[last]} ${line.trim()}`;
    } else {
      out.push(line);
    }
  });
  return out.join('\n');
}

/**
 * Some web pages put a blank line after every line, so each line looks like a
 * stanza of its own. True when there are at least four lines and none of the
 * "stanzas" has more than one line.
 */
export function looksDoubleSpaced(lines: readonly string[]): boolean {
  const filled = lines.filter((l) => !isBlank(l));
  if (filled.length < 4) return false;
  return lines.every((line, i) => isBlank(line) || isBlank(lines[i - 1] ?? '') || i === 0);
}

/** Removes every blank line, for a poem that was pasted double-spaced. */
export function closeUp(lines: readonly string[]): string[] {
  return lines.filter((l) => !isBlank(l));
}

const COMMON: Record<PoemLanguage, readonly string[]> = {
  en: ['the', 'a', 'an', 'and', 'of', 'i', 'not', 'what', 'that', 'my', 'you', 'to', 'with', 'it'],
  nl: ['de', 'het', 'een', 'en', 'van', 'ik', 'niet', 'zijn', 'wat', 'die', 'dat', 'mijn', 'je', 'met', 'naar', 'als'],
};

export interface LanguageGuess {
  language: PoemLanguage;
  /** False when the text gives too few clues, so the reader should be asked. */
  sure: boolean;
}

/**
 * A guess from common words. The reader knows the poem's language, but the
 * app needs it to split syllables and to listen to a recital, so it asks only
 * when the words don't make it clear. Falls back to the interface language.
 */
export function guessLanguage(text: string, fallback: PoemLanguage): LanguageGuess {
  const words = text.toLowerCase().split(/[^\p{L}’']+/u);
  const score = (lang: PoemLanguage) => words.filter((w) => COMMON[lang].includes(w)).length;
  const en = score('en');
  const nl = score('nl');
  if (en === nl) return { language: fallback, sure: false };
  const language = nl > en ? 'nl' : 'en';
  const [best, other] = nl > en ? [nl, en] : [en, nl];
  return { language, sure: best >= 3 && best >= 2 * other };
}
