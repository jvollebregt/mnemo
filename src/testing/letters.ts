/**
 * jsdom lays nothing out, so every letter would sit at the same spot. In the
 * tests each letter of a line is 12px wide, at 12px times its place in the
 * line, and each line sits 30px below the one before, as their strokes expect.
 */
export function letterBox(el: Element): DOMRect | undefined {
  const at = el.getAttribute('data-at');
  const line = el.closest('[data-line]')?.getAttribute('data-line');
  if (at === null || line == null) return undefined;
  const x = Number(at) * 12;
  const y = Number(line) * 30;
  return { left: x, right: x + 12, top: y, bottom: y + 20, x, y, width: 12, height: 20, toJSON: () => ({}) };
}
