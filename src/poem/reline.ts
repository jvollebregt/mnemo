import type { Unit } from '../learn/schedule';
import type { PoemMarks } from '../pencil/marks';
import type { ParsedPoem } from './parse';

/**
 * When the reader corrects a poem's text, what they marked and learned on the
 * lines they left alone carries over. A line that changed starts afresh: its
 * marks sit on letters that may no longer be there.
 */
export interface Reline {
  /** Old line number → new line number, for lines that are still word for word the same. */
  lines: Map<number, number>;
  /** Old stanza index → new stanza index, for stanzas whose every line carried over. */
  stanzas: Map<number, number>;
}

export function reline(before: ParsedPoem, after: ParsedPoem): Reline {
  const old = before.stanzas.flatMap((s) => s.lines);
  const next = after.stanzas.flatMap((s) => s.lines);
  const lines = new Map<number, number>();
  // The longest run of unchanged lines in order, so a line added or taken out
  // doesn't loosen everything after it.
  const n = old.length;
  const k = next.length;
  const common: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(k + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1)
    for (let j = k - 1; j >= 0; j -= 1)
      common[i]![j] =
        old[i]!.text === next[j]!.text ? common[i + 1]![j + 1]! + 1 : Math.max(common[i + 1]![j]!, common[i]![j + 1]!);
  for (let i = 0, j = 0; i < n && j < k; ) {
    if (old[i]!.text === next[j]!.text) {
      lines.set(old[i]!.number, next[j]!.number);
      i += 1;
      j += 1;
    } else if (common[i + 1]![j]! >= common[i]![j + 1]!) i += 1;
    else j += 1;
  }

  const stanzaOf = new Map(after.stanzas.flatMap((s, index) => s.lines.map((l) => [l.number, index] as const)));
  const stanzas = new Map<number, number>();
  before.stanzas.forEach((stanza, index) => {
    const moved = stanza.lines.map((l) => lines.get(l.number));
    const target = moved[0] === undefined ? undefined : stanzaOf.get(moved[0]);
    if (
      target !== undefined &&
      moved.every((m) => m !== undefined && stanzaOf.get(m) === target) &&
      after.stanzas[target]!.lines.length === stanza.lines.length
    )
      stanzas.set(index, target);
  });
  return { lines, stanzas };
}

const moveKey = (key: string, lines: ReadonlyMap<number, number>): string | undefined => {
  const [line, at] = key.split(':');
  const to = lines.get(Number(line));
  return to === undefined ? undefined : `${to}:${at}`;
};

export function relineMarks(marks: PoemMarks, { lines }: Reline): PoemMarks {
  const keys = (list: readonly string[]) => list.flatMap((key) => moveKey(key, lines) ?? []);
  const splits: PoemMarks['splits'] = {};
  for (const [line, cuts] of Object.entries(marks.splits)) {
    const to = lines.get(Number(line));
    if (to !== undefined) splits[to] = cuts;
  }
  return {
    beats: keys(marks.beats),
    pauses: keys(marks.pauses),
    settled: marks.settled.flatMap((line) => lines.get(line) ?? []),
    echoes: marks.echoes.flatMap((echo) => {
      const to = lines.get(echo.line);
      return to === undefined ? [] : [{ ...echo, line: to }];
    }),
    splits,
  };
}

/** Where a scheduled stanza or line went, or nothing if it changed. */
export function relineUnit(unit: string, { lines, stanzas }: Reline): Unit | undefined {
  const [kind, at] = unit.split(':');
  const to = (kind === 'line' ? lines : kind === 'stanza' ? stanzas : undefined)?.get(Number(at));
  return to === undefined ? undefined : (`${kind}:${to}` as Unit);
}
