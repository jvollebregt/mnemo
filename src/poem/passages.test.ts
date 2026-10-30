import { describe, expect, it } from 'vitest';
import { closure, passagesOf } from './passages';

const lines = (texts: readonly string[]) => texts.map((text) => ({ text }));
const sizes = (texts: readonly string[]) => passagesOf(lines(texts)).map((p) => p.length);

const SONNET_18 = [
  'Shall I compare thee to a summer’s day?',
  'Thou art more lovely and more temperate:',
  'Rough winds do shake the darling buds of May,',
  'And summer’s lease hath all too short a date;',
  'Sometime too hot the eye of heaven shines,',
  'And often is his gold complexion dimm’d;',
  'And every fair from fair sometime declines,',
  'By chance or nature’s changing course untrimm’d;',
  'But thy eternal summer shall not fade,',
  'Nor lose possession of that fair thou ow’st;',
  'Nor shall death brag thou wander’st in his shade,',
  'When in eternal lines to time thou grow’st:',
  'So long as men can breathe or eyes can see,',
  'So long lives this, and this gives life to thee.',
];

describe('closure', () => {
  it('ranks a sentence’s end above a semicolon, and that above a comma or dash', () => {
    expect(closure('Shall I compare thee to a summer’s day?')).toBe(3);
    expect(closure('Thou art more lovely and more temperate:')).toBe(2);
    expect(closure('Rough winds do shake the darling buds of May,')).toBe(1);
    expect(closure('“Hope” is the thing with feathers -')).toBe(1);
    expect(closure('Because I could not stop for Death')).toBe(0);
  });

  it('looks past closing quotes and brackets', () => {
    expect(closure('And said, “Go home.”')).toBe(3);
    expect(closure('(as he said so;)')).toBe(2);
  });
});

describe('passagesOf', () => {
  it('leaves a stanza of eight lines or fewer whole', () => {
    expect(sizes(SONNET_18.slice(0, 8))).toEqual([8]);
    expect(sizes(SONNET_18.slice(0, 3))).toEqual([3]);
    expect(passagesOf([])).toEqual([]);
  });

  it('cuts a sonnet set as one block at its turn, where a sentence part ends', () => {
    expect(sizes(SONNET_18)).toEqual([8, 6]);
  });

  it('prefers a full stop to a comma, even if the passage comes out longer or shorter', () => {
    const texts = Array.from({ length: 12 }, (_, i) => (i === 4 ? 'a line that ends.' : 'a line that runs on,'));
    expect(sizes(texts)).toEqual([5, 7]);
  });

  it('never leaves a scrap of fewer than four lines, nor a passage of more than eight', () => {
    for (let n = 9; n <= 60; n += 1) {
      const texts = Array.from({ length: n }, (_, i) => `line ${i}${i % 3 === 2 ? '.' : ''}`);
      const cut = sizes(texts);
      expect(cut.reduce((a, b) => a + b)).toBe(n);
      expect(cut.every((size) => size >= 4 && size <= 8)).toBe(true);
    }
  });

  it('keeps the lines themselves, in order', () => {
    const cut = passagesOf(lines(SONNET_18));
    expect(cut.flat().map((l) => l.text)).toEqual(SONNET_18);
  });
});
