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

/** How much of a stanza must still show for it to stay in hand: about two lines, or all of a shorter one. */
export const STAYS = 60;

/**
 * Whether the stanza in hand is still on the screen, between `top` and
 * `bottom`, so that it stays in hand while the page scrolls. Only once it is
 * scrolled off does the one across the reading line take over.
 */
export function stillInView(box: { top: number; bottom: number }, top: number, bottom: number): boolean {
  const showing = Math.min(box.bottom, bottom) - Math.max(box.top, top);
  return showing >= Math.min(STAYS, box.bottom - box.top);
}
