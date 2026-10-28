import { beforeAll, describe, expect, it } from 'vitest';
import { loadEnglishCounts, type SyllableCounts } from './syllables';
import { lastWord, syllablesOf, tokenize } from './tokens';

let counts: SyllableCounts;
beforeAll(async () => {
  counts = await loadEnglishCounts();
});

describe('tokenize', () => {
  it('cuts a line into words, syllables, spaces and punctuation, keeping offsets', () => {
    const line = '“Hope” is the thing with feathers -';
    const tokens = tokenize(line, { language: 'en', counts });
    expect(tokens.map((t) => `${t.kind}:${t.text}`)).toEqual([
      'punct:“',
      'word:Hope',
      'punct:”',
      'space: ',
      'word:is',
      'space: ',
      'word:the',
      'space: ',
      'word:thing',
      'space: ',
      'word:with',
      'space: ',
      'word:feathers',
      'space: ',
      'punct:-',
    ]);
    for (const token of tokens) expect(line.slice(token.start, token.start + token.text.length)).toBe(token.text);
    expect(syllablesOf(tokens).map((s) => `${s.text}@${s.start}`)).toEqual([
      'Hope@1',
      'is@7',
      'the@10',
      'thing@14',
      'with@20',
      'feath@25',
      'ers@30',
    ]);
  });

  it('keeps apostrophes inside words', () => {
    const tokens = tokenize('I wander’d off', { language: 'en', counts });
    expect(syllablesOf(tokens).map((s) => s.text)).toEqual(['I', 'wan', 'der’d', 'off']);
  });

  it('splits hyphenated words into two words', () => {
    const tokens = tokenize('night-air,', { language: 'en', counts });
    expect(tokens.map((t) => t.text)).toEqual(['night', '-', 'air', ',']);
  });

  it('uses the reader’s own cut of a word over the guess', () => {
    const tokens = tokenize('And sweetest', { language: 'en', counts }, { 4: [5] });
    expect(syllablesOf(tokens).map((s) => s.text)).toEqual(['And', 'sweet', 'est']);
    const recut = tokenize('And sweetest', { language: 'en', counts }, { 4: [4] });
    expect(syllablesOf(recut).map((s) => `${s.text}@${s.start}`)).toEqual(['And@0', 'swee@4', 'test@8']);
  });

  it('gives a clipped word with no vowel no syllable of its own', () => {
    const tokens = tokenize('met ’t zwarte kabotseken aan', { language: 'nl' });
    expect(syllablesOf(tokens).map((s) => s.text)).toEqual(['met', 'zwar', 'te', 'ka', 'bot', 'se', 'ken', 'aan']);
  });

  it('finds the word that closes the line, past any punctuation', () => {
    expect(lastWord(tokenize('That perches in the soul -', { language: 'en', counts }))?.text).toBe('soul');
    expect(lastWord(tokenize(' — ', { language: 'en', counts }))).toBeUndefined();
  });
});
