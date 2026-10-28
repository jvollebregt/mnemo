/**
 * The order of practice through a poem. Each stanza goes through the whole
 * method on its own. From the second stanza on, the join with the stanza
 * before is practised by itself, since that is where recitals usually break,
 * and then all the stanzas so far are recited together.
 */

export type Step =
  /** One stanza, from reading it to the check. */
  | { kind: 'stanza'; stanza: number }
  /** The last line of the stanza before, and the first line of this one. */
  | { kind: 'seam'; stanza: number }
  /** The first stanza through this one. */
  | { kind: 'chain'; through: number };

interface Stanzas {
  stanzas: readonly { lines: readonly { number: number }[] }[];
}

/** What comes after a step that went well, or nothing once the poem is done. */
export function stepAfter(step: Step, count: number): Step | undefined {
  switch (step.kind) {
    case 'stanza':
      if (step.stanza > 0) return { kind: 'seam', stanza: step.stanza };
      return step.stanza + 1 < count ? { kind: 'stanza', stanza: step.stanza + 1 } : undefined;
    case 'seam':
      return { kind: 'chain', through: step.stanza };
    case 'chain':
      return step.through + 1 < count ? { kind: 'stanza', stanza: step.through + 1 } : undefined;
  }
}

/** The lines on the page during a step, by number. */
export function linesOf(step: Step, poem: Stanzas): number[] {
  const numbers = (index: number) => poem.stanzas[index]?.lines.map((l) => l.number) ?? [];
  switch (step.kind) {
    case 'stanza':
      return numbers(step.stanza);
    case 'seam':
      return [numbers(step.stanza - 1).at(-1), numbers(step.stanza)[0]].filter((n): n is number => n !== undefined);
    case 'chain':
      return Array.from({ length: step.through + 1 }, (_, i) => numbers(i)).flat();
  }
}

/** The stanzas a step touches, by index. */
export function stanzasOf(step: Step): number[] {
  switch (step.kind) {
    case 'stanza':
      return [step.stanza];
    case 'seam':
      return [step.stanza - 1, step.stanza];
    case 'chain':
      return Array.from({ length: step.through + 1 }, (_, i) => i);
  }
}
