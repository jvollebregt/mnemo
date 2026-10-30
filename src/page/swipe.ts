import { useEffect, useEffectEvent } from 'react';

/** A swipe back starts this close to the left edge of the screen, as on the phone itself. */
export const EDGE_PX = 24;
/** And goes at least this far to the right. */
export const SWIPE_BACK_PX = 60;

interface Point {
  x: number;
  y: number;
}

/** Whether a touch that went from `start` to `end` was a swipe in from the left edge. */
export function isSwipeBack(start: Point, end: Point): boolean {
  const dx = end.x - start.x;
  const dy = Math.abs(end.y - start.y);
  return start.x <= EDGE_PX && dx >= SWIPE_BACK_PX && dy < dx / 2;
}

/**
 * A swipe in from the left edge does what the word at the top left of the
 * page does. While a sheet is open it is left alone: the sheet has its own.
 */
export function useSwipeBack(onBack: () => void) {
  const back = useEffectEvent(onBack);
  useEffect(() => {
    let start: Point | null = null;
    const down = (e: TouchEvent) => {
      const touch = e.touches[0];
      start = touch && e.touches.length === 1 && !document.querySelector('.sheet') ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const up = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (start && touch && isSwipeBack(start, { x: touch.clientX, y: touch.clientY })) back();
      start = null;
    };
    const cancel = () => {
      start = null;
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', cancel);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', cancel);
    };
  }, []);
}
