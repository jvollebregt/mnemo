/**
 * What the reader has marked on a poem with the pencil. Everything here is
 * the reader's own hearing: the app never adds a beat, an echo or a pause by
 * itself. The one thing it fills in is the light mark (˘) on a settled line's
 * other syllables, which only shows how many there are.
 */

/** Underline styles, one per echo family. Never colours. */
export const ECHO_FAMILIES = [1, 2, 3, 4, 5] as const;
export type EchoFamily = (typeof ECHO_FAMILIES)[number];

/** An echo: letters [start, end) of a line, underlined in one family's style. */
export interface Echo {
  family: EchoFamily;
  line: number;
  start: number;
  end: number;
}

export interface PoemMarks {
  /** Stressed syllables, as "line:offset" of the syllable's first letter. */
  beats: string[];
  /** Lines whose unmarked syllables show a light mark: the reader has moved on from them. */
  settled: number[];
  echoes: Echo[];
  /** Pauses, as "line:offset" of the punctuation or space they sit on. */
  pauses: string[];
  /** The reader's own syllable cuts: line → word offset → break offsets within the word. */
  splits: Record<number, Record<number, number[]>>;
}

export const emptyMarks = (): PoemMarks => ({ beats: [], settled: [], echoes: [], pauses: [], splits: {} });

export const markKey = (line: number, offset: number) => `${line}:${offset}`;

const toggle = (list: readonly string[], key: string) =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

export function toggleBeat(marks: PoemMarks, line: number, offset: number): PoemMarks {
  return { ...marks, beats: toggle(marks.beats, markKey(line, offset)) };
}

export function settle(marks: PoemMarks, line: number): PoemMarks {
  return marks.settled.includes(line) ? marks : { ...marks, settled: [...marks.settled, line] };
}

export function togglePause(marks: PoemMarks, line: number, offset: number): PoemMarks {
  return { ...marks, pauses: toggle(marks.pauses, markKey(line, offset)) };
}

const overlaps = (a: Echo, line: number, start: number, end: number) => a.line === line && a.start < end && start < a.end;

/** The echo underlining this letter, if any. */
export function echoAt(marks: PoemMarks, line: number, offset: number): Echo | undefined {
  return marks.echoes.find((e) => overlaps(e, line, offset, offset + 1));
}

/** Adds an echo. A letter carries one underline, so echoes it draws over are replaced. */
export function addEcho(marks: PoemMarks, echo: Echo): PoemMarks {
  if (echo.end <= echo.start) return marks;
  return {
    ...marks,
    echoes: [...marks.echoes.filter((e) => !overlaps(e, echo.line, echo.start, echo.end)), echo],
  };
}

export function eraseEcho(marks: PoemMarks, echo: Echo): PoemMarks {
  return { ...marks, echoes: marks.echoes.filter((e) => e !== echo && !sameEcho(e, echo)) };
}

const sameEcho = (a: Echo, b: Echo) => a.line === b.line && a.start === b.start && a.end === b.end && a.family === b.family;

export function setSplit(marks: PoemMarks, line: number, wordStart: number, breaks: readonly number[]): PoemMarks {
  return {
    ...marks,
    splits: { ...marks.splits, [line]: { ...marks.splits[line], [wordStart]: [...breaks].sort((a, b) => a - b) } },
  };
}

/** Lines the reader has marked anything on, or moved on from. */
export function markedLines(marks: PoemMarks): Set<number> {
  const line = (key: string) => Number(key.split(':')[0]);
  return new Set([
    ...marks.settled,
    ...marks.beats.map(line),
    ...marks.pauses.map(line),
    ...marks.echoes.map((e) => e.line),
  ]);
}

/**
 * The reader re-cuts a word. Beats left on what is no longer the start of a
 * syllable would hang in the air, so they go.
 */
export function recut(
  marks: PoemMarks,
  line: number,
  word: { start: number; end: number },
  breaks: readonly number[],
): PoemMarks {
  const next = setSplit(marks, line, word.start, breaks);
  const starts = new Set([word.start, ...breaks.map((b) => word.start + b)]);
  const keep = (key: string) => {
    const [l, at] = key.split(':').map(Number);
    return l !== line || at! < word.start || at! >= word.end || starts.has(at!);
  };
  return { ...next, beats: next.beats.filter(keep) };
}

/**
 * Rhyme letters for the margin. A line gets a letter only when the reader has
 * underlined the end of it (`lineEnds`: the last syllable of each line's last
 * word), and only when that echo family closes at least
 * two lines: one-off echoes and free verse get no letters, and the scheme is
 * never filled in ahead of the reader.
 */
export function rhymeLetters(
  marks: PoemMarks,
  lineEnds: readonly { line: number; start: number; end: number }[],
): Map<number, string> {
  const closing = new Map<number, EchoFamily>();
  for (const { line, start, end } of lineEnds) {
    const last = marks.echoes
      .filter((e) => overlaps(e, line, start, end))
      .sort((a, b) => b.end - a.end)[0];
    if (last) closing.set(line, last.family);
  }
  const lines = [...closing.keys()].sort((a, b) => a - b);
  const used = new Map<EchoFamily, number>();
  for (const line of lines) {
    const family = closing.get(line)!;
    used.set(family, (used.get(family) ?? 0) + 1);
  }
  const letters = new Map<EchoFamily, string>();
  const result = new Map<number, string>();
  for (const line of lines) {
    const family = closing.get(line)!;
    if ((used.get(family) ?? 0) < 2) continue;
    if (!letters.has(family)) letters.set(family, String.fromCharCode(97 + letters.size));
    result.set(line, letters.get(family)!);
  }
  return result;
}

/** Reads stored marks, keeping whatever is valid and dropping the rest. */
export function readMarks(json: string | undefined): PoemMarks {
  const marks = emptyMarks();
  if (!json) return marks;
  try {
    const data = JSON.parse(json) as Partial<PoemMarks>;
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    marks.beats = strings(data.beats);
    marks.pauses = strings(data.pauses);
    marks.settled = Array.isArray(data.settled) ? data.settled.filter((n) => Number.isInteger(n)) : [];
    marks.echoes = Array.isArray(data.echoes)
      ? data.echoes.filter(
          (e): e is Echo =>
            !!e &&
            (ECHO_FAMILIES as readonly number[]).includes(e.family) &&
            [e.line, e.start, e.end].every(Number.isInteger) &&
            e.end > e.start,
        )
      : [];
    marks.splits = data.splits && typeof data.splits === 'object' ? data.splits : {};
  } catch {
    // Unreadable marks are dropped rather than breaking the poem.
  }
  return marks;
}
