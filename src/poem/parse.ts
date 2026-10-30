import { passagesOf } from './passages';

/**
 * Turns pasted text into the poet's lines and stanzas. A stanza too long to
 * learn in one go is cut into passages, which are learned as stanzas are.
 *
 * A line is a line as the poet wrote it. However the page later sets it
 * (shrunk to fit, or turned over with a hanging indent), it stays one line:
 * line numbers, fading and recall all count these lines and nothing else.
 */

export interface Line {
  /** The line as written: leading indentation kept, trailing spaces dropped. */
  text: string;
  /** 1-based position among all the poem's lines, across stanzas. */
  number: number;
}

export interface Stanza {
  lines: Line[];
  /** A passage cut from a long stanza, going on from the one before with no blank line between. */
  continues?: boolean;
}

export interface ParsedPoem {
  stanzas: Stanza[];
  lineCount: number;
}

// Unicode line and paragraph separators turn up in text copied from web pages and PDFs.
export const LINE_BREAK = /\r\n|\r|\n|\u2028|\u2029/;

export function parsePoem(text: string): ParsedPoem {
  const stanzas: Stanza[] = [];
  let current: Line[] = [];
  let number = 0;

  const close = () => {
    passagesOf(current).forEach((lines, i) => stanzas.push(i === 0 ? { lines } : { lines, continues: true }));
    current = [];
  };
  for (const raw of text.split(LINE_BREAK)) {
    const line = raw.replace(/\s+$/u, '');
    if (line.trim() === '') {
      if (current.length > 0) close();
      continue;
    }
    number += 1;
    current.push({ text: line, number });
  }
  if (current.length > 0) close();

  return { stanzas, lineCount: number };
}
