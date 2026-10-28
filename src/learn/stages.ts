/**
 * The stages a stanza goes through, and how each one sets the page. The
 * words fade first and the reader's marks stay; then the marks fade, leaving
 * only the shapes of the lines; then nothing. Whatever the reader didn't mark
 * never appears during the fade, and a peek brings a word back in pencil.
 * At the check the page starts blank and each word comes back in ink as the
 * reader recalls it; once they are done, the rest shows in pencil.
 */

export const STAGES = ['read', 'mark', 'fadeWords', 'marksOnly', 'fadeMarks', 'blank', 'check'] as const;
export type Stage = (typeof STAGES)[number];

/** How a character is set: in ink, as a faint trace of its width, not at all, or peeked at, in pencil. */
export type Look = 'ink' | 'trace' | 'gone' | 'peek';

export const nextStage = (stage: Stage): Stage | undefined => STAGES[STAGES.indexOf(stage) + 1];
export const previousStage = (stage: Stage): Stage | undefined => STAGES[STAGES.indexOf(stage) - 1];

/** The reader's marks show while they mark, and while the words fade under them. */
export const showsMarks = (stage: Stage) => stage === 'mark' || stage === 'fadeWords' || stage === 'marksOnly';

/** A tap on a faded word brings it back. */
export const canPeek = (stage: Stage) => stage !== 'read' && stage !== 'mark';

export interface Character {
  /** A letter of a word, or anything else: punctuation, quotes, dashes. */
  letter: boolean;
  /** The first letter of its word: it stays when the words fade. */
  first?: boolean;
  /** Its word has been peeked at in this stanza. */
  peeked?: boolean;
  /** Punctuation the reader marked as a pause. */
  pause?: boolean;
  /** At the check: its word has been recalled. */
  recalled?: boolean;
}

/** `done`: at the check, the reader has finished reciting. */
export function lookOf(stage: Stage, c: Character, done = false): Look {
  if (c.letter && c.peeked && canPeek(stage)) return 'peek';
  switch (stage) {
    case 'read':
    case 'mark':
      return 'ink';
    case 'check':
      if (!c.letter) return done ? 'ink' : 'gone';
      return c.recalled ? 'ink' : done ? 'peek' : 'gone';
    case 'fadeWords':
      if (c.letter) return c.first ? 'ink' : 'trace';
      return c.pause ? 'ink' : 'trace';
    case 'marksOnly':
      return !c.letter && c.pause ? 'ink' : 'trace';
    case 'fadeMarks':
      return 'trace';
    case 'blank':
      return 'gone';
  }
}
