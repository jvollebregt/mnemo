import { describe, expect, it } from 'vitest';
import { canPeek, lookOf, nextStage, previousStage, showsMarks, STAGES } from './stages';

const word = (first = false, peeked = false) => ({ letter: true, first, peeked });
const stop = (pause = false) => ({ letter: false, pause });

describe('the stages', () => {
  it('run in the order of the method', () => {
    expect(STAGES).toEqual(['read', 'mark', 'fadeWords', 'marksOnly', 'fadeMarks', 'blank', 'check']);
    expect(nextStage('blank')).toBe('check');
    expect(nextStage('check')).toBeUndefined();
    expect(previousStage('fadeWords')).toBe('mark');
    expect(previousStage('read')).toBeUndefined();
  });

  it('keep the reader\'s marks only while they mark and while the words fade', () => {
    expect(STAGES.filter(showsMarks)).toEqual(['mark', 'fadeWords', 'marksOnly']);
  });

  it('let a faded word be peeked at, and only then', () => {
    expect(STAGES.filter(canPeek)).toEqual(['fadeWords', 'marksOnly', 'fadeMarks', 'blank']);
  });
});

describe('lookOf', () => {
  it('fades the words to their first letters, with the rest a trace', () => {
    expect(lookOf('fadeWords', word(true))).toBe('ink');
    expect(lookOf('fadeWords', word())).toBe('trace');
  });

  it('keeps a marked pause and fades unmarked punctuation with the words', () => {
    expect(lookOf('fadeWords', stop(true))).toBe('ink');
    expect(lookOf('fadeWords', stop())).toBe('trace');
    expect(lookOf('marksOnly', stop(true))).toBe('ink');
    expect(lookOf('marksOnly', word(true))).toBe('trace');
  });

  it('leaves only traces once the marks fade, then nothing', () => {
    expect([word(true), stop(true)].map((c) => lookOf('fadeMarks', c))).toEqual(['trace', 'trace']);
    expect([word(true), stop(true)].map((c) => lookOf('blank', c))).toEqual(['gone', 'gone']);
  });

  it('brings a peeked word back in pencil, on any faded stage and in the check', () => {
    expect(lookOf('blank', word(false, true))).toBe('peek');
    expect(lookOf('check', word(false, true))).toBe('peek');
    expect(lookOf('read', word(false, true))).toBe('ink');
  });
});
