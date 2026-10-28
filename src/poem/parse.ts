/**
 * Turns pasted text into the poet's lines and stanzas.
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

  for (const raw of text.split(LINE_BREAK)) {
    const line = raw.replace(/\s+$/u, '');
    if (line.trim() === '') {
      if (current.length > 0) {
        stanzas.push({ lines: current });
        current = [];
      }
      continue;
    }
    number += 1;
    current.push({ text: line, number });
  }
  if (current.length > 0) stanzas.push({ lines: current });

  return { stanzas, lineCount: number };
}
