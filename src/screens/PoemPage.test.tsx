import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Store } from '../store';
import { StoreContext } from '../store/context';
import { migrate } from '../store/migrations';
import { openSqlJs } from '../store/sqljs';
import { PoemPage } from './PoemPage';

const NOTE = /Turn your phone sideways/;

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

  it('suggests turning the phone the first time a poem has lines too long for the page, and only once', async () => {
    lineWidth = 1200;
    const { store, poem } = await storeWithPoem('A very long line indeed\nand another');
    show(store, poem);
    expect(await screen.findByText(NOTE)).toBeTruthy();
    expect(await store.seen.has('turn-phone')).toBe(true);

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
    expect(await store.seen.has('turn-phone')).toBe(false);
  });
});
