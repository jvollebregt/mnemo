import { describe, expect, it } from 'vitest';
import { isSwipeBack } from './swipe';

describe('isSwipeBack', () => {
  it('takes a swipe in from the left edge as going back', () => {
    expect(isSwipeBack({ x: 8, y: 300 }, { x: 140, y: 320 })).toBe(true);
  });

  it('leaves a swipe that starts on the page itself, such as a stroke under letters', () => {
    expect(isSwipeBack({ x: 60, y: 300 }, { x: 240, y: 300 })).toBe(false);
  });

  it('leaves a short nudge and a swipe to the left', () => {
    expect(isSwipeBack({ x: 8, y: 300 }, { x: 40, y: 300 })).toBe(false);
    expect(isSwipeBack({ x: 20, y: 300 }, { x: 0, y: 300 })).toBe(false);
  });

  it('leaves a scroll that only happened to start at the edge', () => {
    expect(isSwipeBack({ x: 8, y: 300 }, { x: 90, y: 500 })).toBe(false);
  });
});
