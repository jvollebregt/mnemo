import { describe, expect, it } from 'vitest';
import { normalize, recalled, typedWords } from './recall';

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
