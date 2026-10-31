import { describe, expect, it } from 'vitest';
import { parsePoem, poetStanzas } from './parse';

const texts = (text: string) => poetStanzas(text).map((s) => s.lines.map((l) => l.text));

describe('parsePoem', () => {
  it('splits stanzas on blank lines', () => {
    const poem = [
      '“Hope” is the thing with feathers -',
      'That perches in the soul -',
      '',
      'And sweetest - in the Gale - is heard -',
      'And sore must be the storm -',
    ].join('\n');
    expect(texts(poem)).toEqual([
      ['“Hope” is the thing with feathers -', 'That perches in the soul -'],
      ['And sweetest - in the Gale - is heard -', 'And sore must be the storm -'],
    ]);
  });

  it('numbers the poet’s lines across stanzas, skipping blank lines', () => {
    expect(poetStanzas('a\nb\n\n\nc\n').map((s) => s.lines.map((l) => l.number))).toEqual([[1, 2], [3]]);
    expect(parsePoem('a\nb\n\n\nc\n').lineCount).toBe(3);
  });

  it('treats several blank lines, or lines of only spaces, as one break', () => {
    expect(texts('a\n \n\t\n\nb')).toEqual([['a'], ['b']]);
  });

  it('ignores blank lines before and after the poem', () => {
    expect(texts('\n\n  \na\nb\n\n')).toEqual([['a', 'b']]);
  });

  it('accepts Windows, old Mac and Unicode line breaks', () => {
    expect(texts('a\r\nb\r\n\r\nc\rd\u2028e\u2029\u2029f')).toEqual([['a', 'b'], ['c', 'd', 'e'], ['f']]);
  });

  it('keeps indentation but drops trailing spaces', () => {
    expect(texts('Line one   \n    indented line\t')).toEqual([['Line one', '    indented line']]);
  });

  it('never splits a long line', () => {
    const whitman =
      'When I sitting heard the astronomer where he lectured with much applause in the lecture-room,';
    const { stanzas, lineCount } = parsePoem(whitman);
    expect(lineCount).toBe(1);
    expect(stanzas[0]?.lines[0]?.text).toBe(whitman);
  });

  it('returns nothing for empty text', () => {
    expect(parsePoem('')).toEqual({ stanzas: [], lineCount: 0 });
    expect(parsePoem(' \n\n ')).toEqual({ stanzas: [], lineCount: 0 });
  });
});

describe('parsePoem, long stanzas', () => {
  const block = Array.from({ length: 14 }, (_, i) => `line ${i + 1}${i === 7 ? '.' : ','}`).join('\n');

  it('cuts a long stanza into passages that go on from each other', () => {
    const { stanzas, lineCount } = parsePoem(`a short one\nof two\n\n${block}`);
    expect(stanzas.map((s) => s.lines.length)).toEqual([2, 8, 6]);
    expect(stanzas.map((s) => !!s.continues)).toEqual([false, false, true]);
    // The poet's lines are counted as ever, across the cut.
    expect(stanzas[2]?.lines[0]).toEqual({ text: 'line 9,', number: 11 });
    expect(lineCount).toBe(16);
  });
});

describe('parsePoem, parts', () => {
  it('learns a short poem whole, keeping the blank line between its stanzas', () => {
    const { stanzas } = parsePoem('In the desert\nI saw a creature\n\nI said\nIs it good');
    expect(stanzas).toHaveLength(1);
    expect(stanzas[0]!.lines.map((l) => !!l.gap)).toEqual([false, false, true, false]);
  });

  it('joins short stanzas of a longer poem into parts of four lines or more', () => {
    const couplet = (n: number) => `line ${n} of a couplet with words enough\nand its second line with words enough`;
    const { stanzas } = parsePoem([1, 2, 3, 4, 5, 6, 7].map(couplet).join('\n\n'));
    expect(stanzas.map((s) => s.lines.length)).toEqual([4, 4, 6]);
    expect(stanzas[0]!.lines[2]).toMatchObject({ number: 3, gap: true });
  });
});
