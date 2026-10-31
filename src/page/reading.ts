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

/** How much of a stanza must still show to count as on the screen: about two lines, or all of a shorter one. */
export const STAYS = 60;

/** The band around the reading line, as parts of the working area from its top, that the stanza in hand may cross. */
export const BAND = [0.3, 0.5] as const;

/** Whether a stanza is still on the screen, between `top` and `bottom`. */
export function stillInView(box: { top: number; bottom: number }, top: number, bottom: number): boolean {
  const showing = Math.min(box.bottom, bottom) - Math.max(box.top, top);
  return showing >= Math.min(STAYS, box.bottom - box.top);
}

/**
 * Which stanza is in hand once the page has scrolled, between `top` and
 * `bottom`. The one in hand stays while it still crosses the band around the
 * reading line; once it has left the band, the one across the reading line
 * takes over, so scrolling either way passes from each stanza to the next.
 * A stanza just tapped (`held`) stays in hand while it is on the screen,
 * until it reaches the band, so it doesn't fade as it scrolls into view.
 */
export function inHandAfter(
  boxes: readonly { top: number; bottom: number }[],
  current: number,
  top: number,
  bottom: number,
  held = false,
): { index: number | undefined; held: boolean } {
  const area = bottom - top;
  const line = top + area * READING_LINE;
  const box = boxes[current];
  if (!box) return { index: stanzaAt(boxes, line), held: false };
  const crosses = box.bottom > top + area * BAND[0] && box.top < top + area * BAND[1];
  if (crosses) return { index: current, held: false };
  if (held && stillInView(box, top, bottom)) return { index: current, held: true };
  return { index: stanzaAt(boxes, line), held: false };
}
