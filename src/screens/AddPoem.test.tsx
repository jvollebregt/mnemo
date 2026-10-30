import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddPoem } from './AddPoem';
import { I18nContext, i18nFor } from '../i18n/context';

const renderSheet = (clipboard: () => Promise<string>) =>
  render(
    <I18nContext.Provider value={i18nFor('en')}>
      <AddPoem onKeep={vi.fn(() => Promise.resolve())} onCancel={vi.fn()} clipboard={clipboard} />
    </I18nContext.Provider>,
  );

const sheet = () => screen.getByRole('textbox') as HTMLTextAreaElement;

describe('the paste word', () => {
  afterEach(cleanup);

  it('puts the copied poem on the sheet in one tap', async () => {
    renderSheet(() => Promise.resolve('Hope is the thing with feathers\nThat perches in the soul'));

    fireEvent.click(screen.getByRole('button', { name: 'paste' }));

    await waitFor(() => expect(sheet().value).toBe('Hope is the thing with feathers\nThat perches in the soul'));
    expect(screen.queryByRole('button', { name: 'paste' })).toBeNull();
    expect(screen.getByRole('button', { name: 'set the page' })).toBeTruthy();
  });

  it('leaves the sheet alone when nothing is copied', async () => {
    const clipboard = vi.fn(() => Promise.resolve('  \n'));
    renderSheet(clipboard);

    fireEvent.click(screen.getByRole('button', { name: 'paste' }));

    await waitFor(() => expect(clipboard).toHaveBeenCalled());
    expect(sheet().value).toBe('');
    expect(screen.getByRole('button', { name: 'paste' })).toBeTruthy();
    // The sheet says so for a moment, in place of its usual line.
    await waitFor(() => expect(sheet().placeholder).toBe('Nothing is copied yet.'));
  });

  it('is gone once the sheet has words, and back when it is cleared', () => {
    renderSheet(() => Promise.resolve(''));

    fireEvent.change(sheet(), { target: { value: 'A line' } });
    expect(screen.queryByRole('button', { name: 'paste' })).toBeNull();

    fireEvent.change(sheet(), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'paste' })).toBeTruthy();
  });
});

describe('the proof', () => {
  afterEach(cleanup);

  it('opens at its title, however far down the sheet was scrolled', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderSheet(() => Promise.resolve(''));
    fireEvent.change(sheet(), { target: { value: 'Stone\n\na stone' } });
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'set the page' }));

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });
});
