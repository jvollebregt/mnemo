/**
 * What the reader has marked on a poem with the pencil. Everything here is
 * the reader's own hearing: the app never adds a beat, an echo or a pause by
 * itself. The one thing it fills in is the light mark (˘) on a settled line's
 * other syllables, which only shows how many there are.
 */

/**
 * Underline styles, never colours: dotted, dashed, double, wavy, solid, thick,
 * dash-dot, long dashes, and doubled dotted, dashed, wavy and dash-dot.
 */
export const ECHO_STYLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type EchoStyle = (typeof ECHO_STYLES)[number];

/**
 * One sound the reader hears echo through the poem. The first twelve each
 * keep a style of their own; a poem with more sounds than that lends a style
 * again, from the sound marked furthest away.
 */
export type EchoFamily = number;

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
  /** The style lent to each sound past the twelfth, chosen when it is first drawn. */
  styles: Record<number, EchoStyle>;
}

export const emptyMarks = (): PoemMarks => ({ beats: [], settled: [], echoes: [], pauses: [], splits: {}, styles: {} });

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
  const lent =
    echo.family > ECHO_STYLES.length && !(echo.family in marks.styles)
      ? { ...marks.styles, [echo.family]: styleFarFrom(marks, echo.line) }
      : marks.styles;
  return withEchoes(
    { ...marks, styles: lent },
    [...marks.echoes.filter((e) => !overlaps(e, echo.line, echo.start, echo.end)), echo],
  );
}

export function eraseEcho(marks: PoemMarks, echo: Echo): PoemMarks {
  return withEchoes(marks, marks.echoes.filter((e) => e !== echo && !sameEcho(e, echo)));
}

/** A sound that no longer has an underline gives its lent style back. */
const withEchoes = (marks: PoemMarks, echoes: Echo[]): PoemMarks => {
  const used = new Set(echoes.map((e) => e.family));
  const styles = Object.fromEntries(Object.entries(marks.styles).filter(([family]) => used.has(Number(family))));
  return { ...marks, echoes, styles };
};

const keptStyle = (marks: PoemMarks, family: EchoFamily): EchoStyle | undefined =>
  family <= ECHO_STYLES.length ? (family as EchoStyle) : marks.styles[family];

/** How a sound is underlined. A sound past the twelfth not yet drawn shows the style it would most likely be lent. */
export const echoStyle = (marks: PoemMarks, family: EchoFamily): EchoStyle =>
  keptStyle(marks, family) ?? styleFarFrom(marks, undefined);

/** The style whose underlines are furthest from this line, so two sounds that share one are seldom seen together. */
function styleFarFrom(marks: PoemMarks, line: number | undefined): EchoStyle {
  let best: EchoStyle = 1;
  let bestDistance = -1;
  for (const style of ECHO_STYLES) {
    const lines = marks.echoes.filter((e) => keptStyle(marks, e.family) === style).map((e) => e.line);
    const distance = lines.length === 0 ? Infinity : line === undefined ? 0 : Math.min(...lines.map((l) => Math.abs(l - line)));
    if (distance > bestDistance) {
      best = style;
      bestDistance = distance;
    }
  }
  return best;
}

/** The sounds the reader has underlined, in the order they were first given a pen. */
export const familiesInUse = (marks: PoemMarks): EchoFamily[] =>
  [...new Set(marks.echoes.map((e) => e.family))].sort((a, b) => a - b);

/** A pen for a sound not yet heard: the first one not in use. */
export function freshFamily(marks: PoemMarks): EchoFamily {
  const used = new Set(marks.echoes.map((e) => e.family));
  let family = 1;
  while (used.has(family)) family += 1;
  return family;
}

/**
 * The words that carry one sound, in the poem's order, each spelling once:
 * the reader's own grouping, read back so they can tell their pens apart.
 */
export function echoWords(
  marks: PoemMarks,
  family: EchoFamily,
  wordAt: (line: number, at: number) => string | undefined,
): string[] {
  const words = marks.echoes
    .filter((e) => e.family === family)
    .sort((a, b) => a.line - b.line || a.start - b.start)
    .flatMap((e) => wordAt(e.line, e.start) ?? []);
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  return new Set([...marks.settled, ...marks.beats.map(line), ...marks.pauses.map(line), ...marks.echoes.map((e) => e.line)]);
}

/**
 * The stanza to fade from the pencil: the one in hand if the reader marked
 * anything on it, else the nearest marked one above it, else below it.
 * Fading a stanza with no marks would leave the page all but empty.
 */
export function markedStanzaNear(stanza: number, stanzaLines: readonly (readonly number[])[], marks: PoemMarks): number {
  const marked = markedLines(marks);
  const has = (i: number) => (stanzaLines[i] ?? []).some((line) => marked.has(line));
  if (has(stanza)) return stanza;
  for (let i = stanza - 1; i >= 0; i -= 1) if (has(i)) return i;
  for (let i = stanza + 1; i < stanzaLines.length; i += 1) if (has(i)) return i;
  return stanza;
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
            Number.isInteger(e.family) &&
            e.family > 0 &&
            [e.line, e.start, e.end].every(Number.isInteger) &&
            e.end > e.start,
        )
      : [];
    marks.splits = data.splits && typeof data.splits === 'object' ? data.splits : {};
    // Marks from before there were more than twelve sounds have no lent styles.
    if (data.styles && typeof data.styles === 'object')
      for (const [family, style] of Object.entries(data.styles))
        if ((ECHO_STYLES as readonly unknown[]).includes(style)) marks.styles[Number(family)] = style;
  } catch {
    // Unreadable marks are dropped rather than breaking the poem.
  }
  return marks;
}
