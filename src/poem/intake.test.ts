import { describe, expect, it } from 'vitest';
import { canJoin, closeUp, guessLanguage, looksDoubleSpaced, mend, nameCase, readPasted, suspectBreaks } from './intake';

// As it comes off a web page: title and byline on top, two long lines broken by a narrow column.
const WHITMAN_PASTED = [
  'When I Heard the Learn’d Astronomer',
  'BY WALT WHITMAN',
  '',
  'When I heard the learn’d astronomer,',
  'When the proofs, the figures, were ranged in columns before me,',
  'When I was shown the charts and diagrams, to add, divide, and',
  'measure them,',
  'When I sitting heard the astronomer where he lectured with much',
  'applause in the lecture-room,',
  'How soon unaccountable I became tired and sick,',
].join('\n');

describe('nameCase', () => {
  it('turns shouted names into names', () => {
    expect(nameCase('WALT WHITMAN')).toBe('Walt Whitman');
    expect(nameCase('GERRIT KOUWENAAR')).toBe('Gerrit Kouwenaar');
    expect(nameCase('MARY O’BRIEN-SMITH')).toBe('Mary O’Brien-Smith');
  });

  it('leaves names in mixed case alone', () => {
    expect(nameCase('e.e. cummings')).toBe('e.e. cummings');
    expect(nameCase('Guido Gezelle')).toBe('Guido Gezelle');
  });
});

describe('readPasted', () => {
  it('takes a title and a byline off the top', () => {
    const pasted = readPasted(WHITMAN_PASTED);
    expect(pasted.title).toBe('When I Heard the Learn’d Astronomer');
    expect(pasted.poet).toBe('Walt Whitman');
    expect(pasted.lines[0]).toBe('When I heard the learn’d astronomer,');
    expect(pasted.lines).toHaveLength(7);
  });

  it('takes a title followed by a blank line, without a poet', () => {
    const pasted = readPasted('Nothing Gold Can Stay\n\nNature’s first green is gold,\nHer hardest hue to hold.');
    expect(pasted).toEqual({
      title: 'Nothing Gold Can Stay',
      poet: '',
      lines: ['Nature’s first green is gold,', 'Her hardest hue to hold.'],
    });
  });

  it('reads a Dutch byline', () => {
    const pasted = readPasted('Het Eenzame Vogeltje\nDOOR GUIDO GEZELLE\n\nIk hoor een vogeltje fluiten\nin ’t verre, verre woud');
    expect(pasted.title).toBe('Het Eenzame Vogeltje');
    expect(pasted.poet).toBe('Guido Gezelle');
  });

  it('guesses no title when the poem starts straight away', () => {
    const pasted = readPasted('“Hope” is the thing with feathers -\nThat perches in the soul -\nAnd sings the tune without the words -');
    expect(pasted.title).toBe('');
    expect(pasted.lines).toHaveLength(3);
  });

  it('keeps the blank lines between stanzas and drops the ones around the poem', () => {
    const pasted = readPasted('\n\na\nb\n\nc\n\n\n');
    expect(pasted.lines).toEqual(['a', 'b', '', 'c']);
  });
});

describe('suspectBreaks', () => {
  it('marks pieces that start in lower case after a line with no punctuation', () => {
    const { lines } = readPasted(WHITMAN_PASTED);
    expect(suspectBreaks(lines)).toEqual([3, 5]);
  });

  it('leaves alone lower-case lines that follow punctuation', () => {
    expect(suspectBreaks(['Ik hoor een vogeltje fluiten,', 'in ’t verre, verre woud'])).toEqual([]);
  });

  it('never marks the first line of a stanza', () => {
    expect(suspectBreaks(['a line with no stop', '', 'and a new stanza'])).toEqual([]);
  });
});

describe('mend', () => {
  it('joins the chosen pieces to the line above', () => {
    const { lines } = readPasted(WHITMAN_PASTED);
    const text = mend(lines, new Set([3, 5]));
    expect(text.split('\n')).toEqual([
      'When I heard the learn’d astronomer,',
      'When the proofs, the figures, were ranged in columns before me,',
      'When I was shown the charts and diagrams, to add, divide, and measure them,',
      'When I sitting heard the astronomer where he lectured with much applause in the lecture-room,',
      'How soon unaccountable I became tired and sick,',
    ]);
  });

  it('never joins across a stanza break', () => {
    const lines = ['a', '', 'b'];
    expect(canJoin(lines, 2)).toBe(false);
    expect(mend(lines, new Set([2]))).toBe('a\n\nb');
  });

  it('collapses runs of blank lines into one stanza break', () => {
    expect(mend(['a', '', '', 'b'], new Set())).toBe('a\n\nb');
  });
});

describe('double spacing', () => {
  it('notices a poem pasted with a blank line after every line', () => {
    const lines = ['one', '', 'two', '', 'three', '', 'four'];
    expect(looksDoubleSpaced(lines)).toBe(true);
    expect(closeUp(lines)).toEqual(['one', 'two', 'three', 'four']);
  });

  it('leaves real stanzas alone', () => {
    expect(looksDoubleSpaced(['one', 'two', '', 'three', 'four'])).toBe(false);
    expect(looksDoubleSpaced(['one', '', 'two'])).toBe(false);
  });
});

describe('guessLanguage', () => {
  it('is sure of English and Dutch when common words make it clear', () => {
    expect(guessLanguage('When I heard the learn’d astronomer, and the proofs, the figures', 'nl')).toEqual({
      language: 'en',
      sure: true,
    });
    expect(guessLanguage('Ik hoor een vogeltje fluiten in het verre woud, en de wind', 'en')).toEqual({
      language: 'nl',
      sure: true,
    });
  });

  it('leans but is unsure when there are only one or two clues', () => {
    expect(guessLanguage('Look’d up in silence at the stars', 'nl')).toEqual({ language: 'en', sure: false });
  });

  it('falls back to the interface language, unsure, when there is nothing to go on', () => {
    expect(guessLanguage('Ozymandias', 'nl')).toEqual({ language: 'nl', sure: false });
    expect(guessLanguage('', 'en')).toEqual({ language: 'en', sure: false });
  });

  it('is unsure of a poem that mixes both', () => {
    expect(guessLanguage('the de and en of van', 'en').sure).toBe(false);
  });
});
