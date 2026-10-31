import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Store } from '../store';
import { StoreContext } from '../store/context';
import { migrate } from '../store/migrations';
import { openSqlJs } from '../store/sqljs';
import { PoemPage } from './PoemPage';

const NOTE = /Turn your phone sideways/;
const SHEET = { name: 'long lines' };

async function storeWithPoem(text: string) {
  const db = await openSqlJs();
  await migrate(db);
  const store = createStore(db);
  const poem = await store.poems.add({ title: 'T', poet: '', language: 'en', text });
  return { store, poem };
}

const show = (store: Store, poem: Awaited<ReturnType<Store['poems']['add']>>) =>
  render(
    <StoreContext.Provider value={store}>
      <PoemPage poem={poem} onBack={() => {}} />
    </StoreContext.Provider>,
  );

describe('PoemPage', () => {
  // jsdom lays nothing out, so give every line a width and the page a measure.
  let lineWidth = 0;
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: lineWidth }) as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(330);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('explains long lines in a sheet the first time a poem has them, and only once', async () => {
    lineWidth = 1200;
    const { store, poem } = await storeWithPoem('A very long line indeed\nand another');
    show(store, poem);
    expect(await screen.findByRole('dialog', SHEET)).toBeTruthy();
    expect(screen.getByText(NOTE)).toBeTruthy();
    expect(await store.seen.has('long-lines')).toBe(true);

    // A tap outside the sheet puts it away.
    fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    cleanup();
    show(store, poem);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('says nothing when every line fits', async () => {
    lineWidth = 200;
    const { store, poem } = await storeWithPoem('Short\nlines');
    show(store, poem);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(await store.seen.has('long-lines')).toBe(false);
  });

  it('opens the poem even when part of what was kept for it cannot be read', async () => {
    lineWidth = 200;
    const { store, poem } = await storeWithPoem('Short\nlines');
    vi.spyOn(store.schedule, 'lastGrades').mockRejectedValue(new Error('locked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    show(store, poem);
    const mark = (await screen.findByRole('button', { name: 'mark what you hear' })) as HTMLButtonElement;
    await waitFor(() => expect(mark.disabled).toBe(false), { timeout: 5000 });
    expect(document.querySelector('[data-line="1"]')?.textContent).toContain('Short');
  });
});
