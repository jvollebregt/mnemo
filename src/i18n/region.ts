import type { PoemLanguage } from '../poem/language';

/**
 * The phone's region decides two small things, so there is no setting for
 * them: whether English is spelled the American or the British way, and which
 * accent the phone listens for when a poem is said aloud.
 */
export type Spelling = 'american' | 'british';

// Regions that spell the American way. Elsewhere, Canada included, English is spelled the British way.
const AMERICAN = new Set(['US', 'PR', 'PH', 'LR', 'UM', 'VI', 'AS', 'GU', 'MP']);

// The English and Dutch accents the phones' on-device recognisers know.
const ACCENTS: Record<PoemLanguage, readonly string[]> = {
  en: ['US', 'GB', 'AU', 'CA', 'IE', 'IN', 'NZ', 'ZA', 'SG', 'PH'],
  nl: ['NL', 'BE'],
};
const FALLBACK: Record<PoemLanguage, string> = { en: 'GB', nl: 'NL' };

const phoneLanguages = (): readonly string[] => (typeof navigator === 'undefined' ? [] : (navigator.languages ?? []));

/** The region of the first of the phone's languages that has one, such as "NL" for "en-NL". */
function region(language: string | undefined, tags: readonly string[]): string | undefined {
  for (const tag of tags) {
    const [base, ...rest] = tag.split(/[-_]/);
    if (language && base?.toLowerCase() !== language) continue;
    const found = rest.find((part) => /^[A-Za-z]{2}$/.test(part));
    if (found) return found.toUpperCase();
  }
  return undefined;
}

export function spellingFor(tags: readonly string[] = phoneLanguages()): Spelling {
  const where = region('en', tags) ?? region(undefined, tags);
  return where && AMERICAN.has(where) ? 'american' : 'british';
}

/** The recogniser's language for a poem: the phone's own accent when the phone knows it, as "en-AU". */
export function speechLanguage(language: PoemLanguage, tags: readonly string[] = phoneLanguages()): string {
  const where = region(language, tags) ?? region(undefined, tags);
  const accent = where && ACCENTS[language].includes(where) ? where : language === 'en' && where && AMERICAN.has(where) ? 'US' : FALLBACK[language];
  return `${language}-${accent}`;
}

// The interface text is written with American spellings; these are the British ones.
const BRITISH: Record<string, string> = {
  meter: 'metre',
  meters: 'metres',
  color: 'colour',
  colors: 'colours',
  gray: 'grey',
  favorite: 'favourite',
  favorites: 'favourites',
  center: 'centre',
  recognize: 'recognise',
  recognized: 'recognised',
  recognizes: 'recognises',
  memorize: 'memorise',
  memorized: 'memorised',
  memorizing: 'memorising',
};
const WORDS = new RegExp(`\\b(${Object.keys(BRITISH).join('|')})\\b`, 'gi');

export function respell(text: string, spelling: Spelling): string {
  if (spelling === 'american') return text;
  return text.replace(WORDS, (word) => {
    const british = BRITISH[word.toLowerCase()]!;
    return word[0] === word[0]!.toUpperCase() ? british[0]!.toUpperCase() + british.slice(1) : british;
  });
}
