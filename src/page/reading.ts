/**
 * While marking, the stanza in hand follows the scroll: it is the one across
 * the reading line, a little above the middle of the page, or else the one
 * nearest to it.
 */
export const READING_LINE = 0.4;

export function stanzaAt(boxes: readonly { top: number; bottom: number }[], line: number): number | undefined {
  let nearest: number | undefined;
  let distance = Infinity;
  boxes.forEach((box, i) => {
    const away = line < box.top ? box.top - line : line > box.bottom ? line - box.bottom : 0;
    if (away < distance) {
      distance = away;
      nearest = i;
    }
  });
  return nearest;
}
