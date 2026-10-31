import { describe, expect, it } from 'vitest';
import { alignment, keptBefore, normalize, reached, recalled, saidInstead, typedPieces, typedWords } from './recall';

const words = (text: string) => text.split(' ').map(normalize);

describe('recall', () => {
  it('compares words without case, accents or apostrophes', () => {
    expect(normalize('“Hope”')).toBe('hope');
    expect(normalize('learn’d')).toBe('learnd');
    expect(normalize('één')).toBe('een');
  });

  it('counts a word once the reader has moved past it, and all of them when done', () => {
    expect(typedWords('Hope is the thi', false)).toEqual(['hope', 'is', 'the']);
    expect(typedWords('Hope is the thing ', false)).toEqual(['hope', 'is', 'the', 'thing']);
    expect(typedWords('Hope is the thing', true)).toEqual(['hope', 'is', 'the', 'thing']);
    expect(typedWords('feathers - That', true)).toEqual(['feathers', 'that']);
    expect(typedWords('lecture-room', true)).toEqual(['lecture', 'room']);
  });

  it('lines the typed words up with the poem in order', () => {
    const poem = words('Hope is the thing with feathers That perches in the soul');
    // A skipped word and an extra one don't throw the rest off.
    expect([...recalled(poem, words('Hope is thing with many feathers That perches in the soul'))]).toEqual([
      0, 1, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    // A repeated word is matched where it belongs.
    expect([...recalled(poem, words('in the soul'))]).toEqual([8, 9, 10]);
    expect(recalled(poem, []).size).toBe(0);
  });
});

describe('spelling', () => {
  const heard = (poem: string, said: string, language?: string) => [...recalled(words(poem), words(said), language)];

  it('lets a recital through whatever spelling the recogniser writes', () => {
    expect(heard('Tyger Tyger burning bright', 'tiger tiger burning bright')).toEqual([0, 1, 2, 3]);
    expect(heard('the colour of the centre', 'the color of the center')).toEqual([0, 1, 2, 3, 4]);
    expect(heard('When I heard the learn’d astronomer', 'when I heard the learned astronomer')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(heard('o’er the four hills', 'over the 4 hills')).toEqual([0, 1, 2, 3]);
    expect(heard('travelled far', 'traveled far')).toEqual([0, 1]);
  });

  it('knows old Dutch spellings', () => {
    expect(heard('de visch zyn vrij', 'de vis zijn vrij', 'nl')).toEqual([0, 1, 2, 3]);
    expect(heard('drie maal', '3 maal', 'nl')).toEqual([0, 1]);
  });

  it('still tells different words apart', () => {
    expect(heard('in the night', 'in the might')).toEqual([0, 1]);
    expect(heard('de maan', 'de man', 'nl')).toEqual([0]);
    expect(heard('our song', 'or song')).toEqual([1]);
  });
});

describe('while reciting', () => {
  const poem = words('In the desert I saw a creature naked bestial Who squatting upon the ground');

  it('knows how far the reader has got, past a word missed, but not on one stray word far ahead', () => {
    expect(reached(recalled(poem, words('In the desert I saw a creature naked pastille who squatting')))).toBe(11);
    expect(reached(recalled(poem, words('In the desert I saw a')))).toBe(6);
    // "ground" alone, far past "saw", doesn't carry the reader there.
    expect(reached(new Set([0, 1, 2, 3, 4, 13]))).toBe(5);
    expect(reached(new Set())).toBe(0);
  });

  it('says what was heard in place of a missed word', () => {
    const said = 'In the desert I saw a creature naked pastille who'.split(' ');
    const pairs = alignment(poem, said.map(normalize));
    expect(saidInstead(pairs, said, 8)).toEqual(['pastille']);
    expect(saidInstead(alignment(poem, words('In the desert I saw')), [], 6)).toEqual([]);
  });

  it('keeps what was said before a line taken again', () => {
    const said = words('In the desert I saw a creature naked pastille who sat');
    expect(keptBefore(alignment(poem, said), said.length, 9)).toBe(9);
    expect(keptBefore(alignment(poem, said), said.length, 0)).toBe(0);
    // Not yet got as far as the line taken again: everything said stays.
    expect(keptBefore(alignment(poem, said), said.length, 12)).toBe(said.length);
  });

  it('keeps the words as written beside the words as compared', () => {
    expect(typedPieces('Is it good, friend?', true)).toEqual(['Is', 'it', 'good', 'friend']);
  });
});
