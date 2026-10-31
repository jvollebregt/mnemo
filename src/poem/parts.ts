/**
 * What is learned at a time. The mind holds about four to eight lines at
 * once, and a poem's stanza breaks are about meaning and sound, not memory.
 * So a short poem is learned whole; stanzas of a line or three are joined to
 * the next until there are four lines or more; and a long stanza is already
 * cut into passages (passages.ts). Each part is learned as a stanza is: it
 * has one numeral, and its own place in the schedule. The page keeps the
 * poet's blank lines inside a part.
 */

/** A poem this short is learned whole: about fifty words, as Crane's "In the Desert". */
export const WHOLE_LINES = 12;
export const WHOLE_WORDS = 60;
const SHORTEST_PART = 4;
const LONGEST_PART = 8;

export interface Unit {
  lines: number;
  words: number;
}

/** Groups the stanzas and passages, in order, into parts: the indexes of the units in each. */
export function partsOf(units: readonly Unit[]): number[][] {
  if (units.length === 0) return [];
  const lines = units.reduce((n, u) => n + u.lines, 0);
  const words = units.reduce((n, u) => n + u.words, 0);
  if (lines <= WHOLE_LINES && words <= WHOLE_WORDS) return [units.map((_, i) => i)];

  const size = (part: readonly number[]) => part.reduce((n, i) => n + units[i]!.lines, 0);
  const parts: number[][] = [];
  let part: number[] = [];
  units.forEach((unit, i) => {
    if (part.length > 0 && (size(part) >= SHORTEST_PART || size(part) + unit.lines > LONGEST_PART)) {
      parts.push(part);
      part = [];
    }
    part.push(i);
  });
  // A short last part joins the one before, if they fit together.
  const before = parts[parts.length - 1];
  if (before && size(part) < SHORTEST_PART && size(before) + size(part) <= LONGEST_PART) before.push(...part);
  else parts.push(part);
  return parts;
}
