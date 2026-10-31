/**
 * Which letter a beats tap meant when the finger missed the letters.
 *
 * A beat stands above its syllable, so the reader taps there, or a little
 * above or between the letters. The space above a line belongs to that line,
 * down to the foot of its letters; for the first line in hand, a mark's height
 * above it does too. The tap then goes to the nearest letter in the row it
 * fell over. Only taps clearly off the lines miss.
 */

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LetterBox extends Box {
  at: number;
}

export interface LineBoxes {
  line: number;
  /** The letters of the line's words, as set on the page. */
  letters: readonly LetterBox[];
}

/** Letters whose tops are this close sit on the same row; a turnover starts a new one. */
const SAME_ROW_PX = 4;

function rowsOf(letters: readonly LetterBox[]): LetterBox[][] {
  const rows: LetterBox[][] = [];
  for (const letter of [...letters].sort((a, b) => a.top - b.top || a.left - b.left)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0]!.top - letter.top) <= SAME_ROW_PX) row.push(letter);
    else rows.push([letter]);
  }
  return rows;
}

const bottomOf = (boxes: readonly Box[]) => Math.max(...boxes.map((b) => b.bottom));
const topOf = (boxes: readonly Box[]) => Math.min(...boxes.map((b) => b.top));

/**
 * The line and letter a point belongs to, or undefined for empty paper.
 * `lines` are the lines in hand, top to bottom; `above` is how far over the
 * first of them still counts as its own; `beside` how far past either end of
 * a row.
 */
export function letterNear(
  lines: readonly LineBoxes[],
  x: number,
  y: number,
  { above, beside }: { above: number; beside: number },
): { line: number; at: number } | undefined {
  const set = lines.filter((l) => l.letters.length > 0);
  let ceiling = set.length > 0 ? topOf(set[0]!.letters) - above : 0;
  for (const { line, letters } of set) {
    const floor = bottomOf(letters);
    if (y < ceiling) return undefined;
    if (y <= floor) {
      // Within a line that turns over, the space above each row is that row's.
      let rowCeiling = ceiling;
      for (const row of rowsOf(letters)) {
        const rowFloor = bottomOf(row);
        if (y >= rowCeiling && y <= rowFloor) return nearestIn(row, line, x, beside);
        rowCeiling = rowFloor;
      }
      return undefined;
    }
    ceiling = floor;
  }
  return undefined;
}

function nearestIn(row: readonly LetterBox[], line: number, x: number, beside: number) {
  const left = Math.min(...row.map((l) => l.left));
  const right = Math.max(...row.map((l) => l.right));
  if (x < left - beside || x > right + beside) return undefined;
  const distance = (l: LetterBox) => (x < l.left ? l.left - x : x > l.right ? x - l.right : 0);
  const nearest = row.reduce((best, l) => (distance(l) < distance(best) ? l : best));
  return { line, at: nearest.at };
}

/**
 * The same for an echo, whose underline runs below its letters: the space
 * below a line, where its underlines go, belongs to that line, and `below`
 * is how far under the last line in hand still counts.
 */
export function letterAbove(
  lines: readonly LineBoxes[],
  x: number,
  y: number,
  { below, beside }: { below: number; beside: number },
): { line: number; at: number } | undefined {
  // Turned upside down, the space below a line is the space above it.
  const flip = (l: LetterBox): LetterBox => ({ ...l, top: -l.bottom, bottom: -l.top });
  const flipped = [...lines].reverse().map(({ line, letters }) => ({ line, letters: letters.map(flip) }));
  return letterNear(flipped, x, -y, { above: below, beside });
}

/** While a stroke is drawn along a line, the letter of that line nearest the finger, wherever it strays. */
export function letterAlong(line: LineBoxes, x: number, y: number): number | undefined {
  const rows = rowsOf(line.letters);
  if (rows.length === 0) return undefined;
  const middle = (row: readonly Box[]) => (topOf(row) + bottomOf(row)) / 2;
  const row = rows.reduce((best, r) => (Math.abs(middle(r) - y) < Math.abs(middle(best) - y) ? r : best));
  return nearestIn(row, line.line, x, Infinity)?.at;
}
