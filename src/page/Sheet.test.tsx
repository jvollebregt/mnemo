import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sheet } from './Sheet';

const open = () => {
  const onClose = vi.fn();
  render(
    <Sheet title="beats" onClose={onClose}>
      <p>A lesson.</p>
    </Sheet>,
  );
  return onClose;
};

describe('Sheet', () => {
  afterEach(cleanup);

  it('is put away with the words at its foot', () => {
    const onClose = open();
    fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('is put away with a tap outside it', () => {
    const onClose = open();
    fireEvent.click(document.querySelector('.sheet-backdrop')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('is put away with a swipe down, but not a small nudge', () => {
    const onClose = open();
    const sheet = screen.getByRole('dialog', { name: 'beats' });
    fireEvent.touchStart(sheet, { touches: [{ clientY: 400 }] });
    fireEvent.touchMove(sheet, { touches: [{ clientY: 430 }] });
    fireEvent.touchEnd(sheet);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.touchStart(sheet, { touches: [{ clientY: 400 }] });
    fireEvent.touchMove(sheet, { touches: [{ clientY: 520 }] });
    fireEvent.touchEnd(sheet);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
