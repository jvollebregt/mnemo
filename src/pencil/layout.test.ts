import { describe, expect, it } from 'vitest';
import { layoutLine, pauseAfter, strokeRange, syllableAt } from './layout';
import { addEcho, emptyMarks, settle, toggleBeat, togglePause } from './marks';
import { tokenize } from './tokens';

const LINE = 'That perches in the soul —';
const tokens = tokenize(LINE, { language: 'en' });

const marks = (...f: ((m: ReturnType<typeof emptyMarks>) => ReturnType<typeof emptyMarks>)[]) =>
  f.reduce((m, step) => step(m), emptyMarks());

describe('layoutLine', () => {
  it('sets every syllable, space and stop, keeping the text whole', () => {
    const pieces = layoutLine(tokens, emptyMarks(), 2);
    expect(pieces.map((p) => p.runs.flatMap((r) => r.glyphs.map((g) => g.ch)).join('')).join('')).toBe(LINE);
    expect(pieces.filter((p) => p.kind === 'syllable').map((p) => p.start)).toEqual([0, 5, 10, 13, 16, 20]);
  });

  it('shows nothing but beats while a line is being marked', () => {
    const pieces = layoutLine(tokens, marks((m) => toggleBeat(m, 2, 5)), 2);
    expect(pieces.filter((p) => p.mark).map((p) => [p.start, p.mark])).toEqual([[5, 'beat']]);
  });

  it('gives a settled line a light mark on every other syllable', () => {
    const pieces = layoutLine(tokens, marks((m) => toggleBeat(m, 2, 5), (m) => settle(m, 2)), 2);
    expect(pieces.filter((p) => p.kind === 'syllable').map((p) => p.mark)).toEqual([
      'light',
      'beat',
      'light',
      'light',
      'light',
      'light',
    ]);
  });

  it('underlines only the letters of an echo, and the stroke being drawn', () => {
    const m = marks((x) => addEcho(x, { family: 2, line: 2, start: 20, end: 24 }));
    const pieces = layoutLine(tokens, m, 2, { family: 3, start: 0, end: 2 });
    const underlined = pieces.flatMap((p) => p.runs.filter((r) => r.echo).map((r) => [r.echo, !!r.preview, r.glyphs.map((g) => g.ch).join('')]));
    expect(underlined).toEqual([
      [3, true, 'Th'],
      [2, false, 'soul'],
    ]);
  });

  it('marks the pauses the reader heard', () => {
    const pieces = layoutLine(tokens, marks((m) => togglePause(m, 2, 25)), 2);
    expect(pieces.filter((p) => p.pause).map((p) => p.start)).toEqual([25]);
  });
});

describe('fading', () => {
  const looks = (pieces: ReturnType<typeof layoutLine>) =>
    pieces.flatMap((p) => p.runs.map((r) => `${r.glyphs.map((g) => g.ch).join('')}:${r.look ?? 'ink'}`));

  it('keeps each word\'s first letter, a marked pause and the reader\'s echoes', () => {
    const m = marks((x) => togglePause(x, 2, 25), (x) => addEcho(x, { family: 1, line: 2, start: 21, end: 24 }));
    const pieces = layoutLine(tokens, m, 2, undefined, { stage: 'fadeWords', peeked: new Set() });
    expect(looks(pieces).slice(0, 4)).toEqual(['T:ink', 'hat:trace', ' :ink', 'p:ink']);
    expect(looks(pieces).slice(-4)).toEqual(['s:ink', 'oul:trace', ' :ink', '—:ink']);
    expect(pieces.flatMap((p) => p.runs.filter((r) => r.echo).map((r) => r.echo))).toEqual([1]);
  });

  it('brings a peeked word back whole', () => {
    const pieces = layoutLine(tokens, emptyMarks(), 2, undefined, { stage: 'blank', peeked: new Set([20]) });
    expect(looks(pieces).filter((l) => !l.endsWith(':gone') && !/^\s+:/.test(l))).toEqual(['soul:peek']);
  });
});

describe('finding the target of a tap', () => {
  it('finds the syllable under the finger', () => {
    expect(syllableAt(tokens, 11)).toBe(10);
    expect(syllableAt(tokens, 4)).toBeUndefined();
  });

  it('puts a pause tapped on a word after it: on its punctuation, else between words', () => {
    expect(pauseAfter(tokens, 21)).toBe(25);
    expect(pauseAfter(tokens, 1)).toBe(4);
    expect(pauseAfter(tokenize('the soul', { language: 'en' }), 5)).toBeUndefined();
  });

  it('trims a stroke to letters, whichever way it was drawn', () => {
    expect(strokeRange(LINE, 23, 19)).toEqual({ start: 20, end: 24 });
    expect(strokeRange(LINE, 4, 4)).toBeUndefined();
  });
});
