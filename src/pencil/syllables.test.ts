import { beforeAll, describe, expect, it } from 'vitest';
import { cut, loadEnglishCounts, syllableBreaks, type SyllableCounts } from './syllables';

let counts: SyllableCounts;
beforeAll(async () => {
  counts = await loadEnglishCounts();
});

const en = (word: string) => cut(word, syllableBreaks(word, 'en', counts)).join('|');
const nl = (word: string) => cut(word, syllableBreaks(word, 'nl')).join('|');

describe('English syllables', () => {
  it('keeps one-syllable words whole', () => {
    expect(['Hope', 'thing', 'heard', 'soul', 'stone', 'storm', 'Bird'].map(en)).toEqual([
      'Hope',
      'thing',
      'heard',
      'soul',
      'stone',
      'storm',
      'Bird',
    ]);
  });

  it('splits where a printer would, when the count agrees', () => {
    expect(en('feathers')).toBe('feath|ers');
    expect(en('without')).toBe('with|out');
    expect(en('little')).toBe('lit|tle');
    expect(en('beautiful')).toBe('beau|ti|ful');
  });

  it('adds the breaks a printer leaves out, using the dictionary count', () => {
    expect(en('abash')).toBe('a|bash');
    expect(en('astronomer')).toBe('as|tro|no|mer');
    expect(en('chillest')).toBe('chil|lest');
    expect(en('extremity')).toBe('ex|trem|i|ty');
    expect(en('unaccountable')).toBe('un|ac|count|a|ble');
  });

  it('cuts around an e the dictionary doesn’t sound', () => {
    expect(en('evening')).toBe('eve|ning');
    expect(en('Evening')).toBe('Eve|ning');
  });

  it('keeps a printer\'s break between two vowels that are sounded apart', () => {
    expect(en('diagrams')).toBe('di|a|grams');
  });

  it('copes with words the dictionary doesn’t know', () => {
    expect(en('learn’d')).toBe('learn’d');
    expect(en('wander’d')).toBe('wan|der’d');
  });

  it('keeps the original letters and case', () => {
    expect(en('Extremity')).toBe('Ex|trem|i|ty');
  });
});

describe('Dutch syllables', () => {
  it('follows Dutch hyphenation and vowel groups', () => {
    expect(nl('krinklende')).toBe('krink|len|de');
    expect(nl('waterding')).toBe('wa|ter|ding');
    expect(nl('kabotseken')).toBe('ka|bot|se|ken');
    expect(nl('vogeltje')).toBe('vo|gel|tje');
    expect(nl('fluiten')).toBe('flui|ten');
  });

  it('adds breaks at the edges that hyphenation leaves out', () => {
    expect(nl('over')).toBe('o|ver');
    expect(nl('avond')).toBe('a|vond');
  });

  it('keeps vowel groups together', () => {
    expect(nl('eenzame')).toBe('een|za|me');
    expect(nl('rooie')).toBe('rooi|e');
    expect(nl('hoor')).toBe('hoor');
  });
});
