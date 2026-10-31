import { describe, expect, it } from 'vitest';
import { canPeek, lookOf, nextStage, previousStage, showsMarks, STAGES } from './stages';

const word = (first = false, peeked = false) => ({ letter: true, first, peeked });
const stop = (pause = false) => ({ letter: false, pause });

describe('the stages', () => {
  it('run in the order of the method', () => {
    expect(STAGES).toEqual(['read', 'mark', 'fadeWords', 'marksOnly', 'fadeMarks', 'blank']);
    expect(nextStage('fadeMarks')).toBe('blank');
    expect(nextStage('blank')).toBeUndefined();
    expect(previousStage('fadeWords')).toBe('mark');
    expect(previousStage('read')).toBeUndefined();
  });

  it('keep the reader\'s marks only while they mark and while the words fade', () => {
    expect(STAGES.filter(showsMarks)).toEqual(['mark', 'fadeWords', 'marksOnly']);
  });

  it('let a faded word be peeked at on the practice pages, and never on the recital', () => {
    expect(STAGES.filter(canPeek)).toEqual(['fadeWords', 'marksOnly', 'fadeMarks']);
  });
});

describe('lookOf', () => {
  it('fades the words to their first letters, with the rest a trace', () => {
    expect(lookOf('fadeWords', word(true))).toBe('ink');
    expect(lookOf('fadeWords', word())).toBe('trace');
  });

  it('keeps a marked pause and fades unmarked punctuation with the words', () => {
    expect(lookOf('fadeWords', stop(true))).toBe('ink');
    expect(lookOf('fadeWords', stop())).toBe('ghost');
    expect(lookOf('marksOnly', stop(true))).toBe('ink');
    expect(lookOf('marksOnly', word(true))).toBe('trace');
    expect(lookOf('marksOnly', stop())).toBe('ghost');
  });

  it('leaves only traces once the marks fade, then nothing', () => {
    expect([word(true), stop(true)].map((c) => lookOf('fadeMarks', c))).toEqual(['trace', 'trace']);
    expect([word(true), stop(true)].map((c) => lookOf('blank', c))).toEqual(['gone', 'gone']);
  });

  it('brings a peeked word back in pencil on the practice pages, but never on the blank page', () => {
    expect(lookOf('fadeWords', word(false, true))).toBe('peek');
    expect(lookOf('fadeMarks', word(false, true))).toBe('peek');
    expect(lookOf('blank', word(false, true))).toBe('gone');
    expect(lookOf('read', word(false, true))).toBe('ink');
  });

  it('starts the blank page empty, brings recalled words back in ink, and the rest in pencil once done', () => {
    const recalled = { letter: true, recalled: true };
    expect([recalled, word(), stop()].map((c) => lookOf('blank', c))).toEqual(['ink', 'gone', 'gone']);
    expect([recalled, word(), stop()].map((c) => lookOf('blank', c, true))).toEqual(['ink', 'peek', 'peek']);
    // Punctuation comes back with the word it goes with.
    expect(lookOf('blank', { letter: false, recalled: true })).toBe('ink');
    expect(lookOf('blank', { letter: false, passed: true })).toBe('peek');
    // A word gone past without being said shows in pencil at once.
    expect(lookOf('blank', { letter: true, passed: true })).toBe('peek');
  });
});
