import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { App } from './App';
import { review, stanzaUnit } from './learn/schedule';
import { I18nContext, i18nFor } from './i18n/context';
import type { Locale } from './i18n';
import { createStore, type Store } from './store';
import { StoreContext } from './store/context';
import { migrate } from './store/migrations';
import { openSqlJs } from './store/sqljs';

async function freshStore(): Promise<Store> {
  const db = await openSqlJs();
  await migrate(db);
  return createStore(db);
}

function renderApp(store: Store, locale: Locale = 'en') {
  const wrap = (children: ReactNode) => (
    <I18nContext.Provider value={i18nFor(locale)}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </I18nContext.Provider>
  );
  return render(wrap(<App />));
}

const WHITMAN_PASTED = [
  'When I Heard the Learn’d Astronomer',
  'BY WALT WHITMAN',
  '',
  'When I heard the learn’d astronomer,',
  'When the proofs, the figures, were ranged in columns before me,',
  'When I was shown the charts and diagrams, to add, divide, and',
  'measure them,',
  'When I sitting heard the astronomer where he lectured with much applause in the lecture-room,',
  'How soon unaccountable I became tired and sick,',
].join('\n');

describe('App', () => {
  afterEach(cleanup);

  it('opens on an empty contents page that invites a first poem', async () => {
    renderApp(await freshStore());
    expect(await screen.findByText('Add a poem you want to know by heart.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'contents' })).toBeTruthy();
  });

  it('adds a pasted poem, mending a broken line, and opens it', async () => {
    const store = await freshStore();
    renderApp(store);

    fireEvent.click(await screen.findByRole('button', { name: 'add a poem' }));
    const setPage = screen.getByRole('button', { name: 'set the page' });
    expect((setPage as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: WHITMAN_PASTED } });
    fireEvent.click(setPage);

    // The title and poet are read off the top of the paste.
    expect((screen.getByRole('textbox', { name: 'title' }) as HTMLInputElement).value).toBe(
      'When I Heard the Learn’d Astronomer',
    );
    expect((screen.getByRole('textbox', { name: 'poet' }) as HTMLInputElement).value).toBe('Walt Whitman');
    // The words make the language plain, so the reader isn't asked.
    expect(screen.queryByText('Is this poem in English or Dutch?')).toBeNull();

    // The broken line is pointed out but not joined until the reader taps it.
    expect(screen.getByText(/One line looks broken/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'measure them,' }));
    expect(screen.getByText(/^Joined\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'keep it' }));

    const entry = await screen.findByRole('button', { name: /When I Heard the Learn’d Astronomer/ });
    expect(entry.textContent).toContain('taking root');
    expect(screen.getByText(/only on your phone/)).toBeTruthy();

    const [stored] = await store.poems.list();
    expect(stored?.text.split('\n')).toEqual([
      'When I heard the learn’d astronomer,',
      'When the proofs, the figures, were ranged in columns before me,',
      'When I was shown the charts and diagrams, to add, divide, and measure them,',
      'When I sitting heard the astronomer where he lectured with much applause in the lecture-room,',
      'How soon unaccountable I became tired and sick,',
    ]);

    fireEvent.click(entry);
    expect(screen.getByRole('heading', { name: 'When I Heard the Learn’d Astronomer' })).toBeTruthy();
    expect(screen.getByText('Walt Whitman')).toBeTruthy();
    // Five of the poet's lines, so the margin numbers the fifth.
    expect(await screen.findByText('5')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'contents' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'contents' })).toBeTruthy());
  });

  it('will not keep a poem without a title', async () => {
    renderApp(await freshStore());
    fireEvent.click(await screen.findByRole('button', { name: 'add a poem' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a line\nanother line\nand a third' } });
    fireEvent.click(screen.getByRole('button', { name: 'set the page' }));
    const keep = screen.getByRole('button', { name: 'keep it' }) as HTMLButtonElement;
    expect(keep.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'title' }), { target: { value: 'Three lines' } });
    expect(keep.disabled).toBe(false);
  });

  it('offers to close up a poem pasted with a blank line after every line', async () => {
    renderApp(await freshStore());
    fireEvent.click(await screen.findByRole('button', { name: 'add a poem' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Spaced Out\n\none\n\ntwo\n\nthree\n\nfour' } });
    fireEvent.click(screen.getByRole('button', { name: 'set the page' }));
    fireEvent.click(screen.getByRole('button', { name: 'close up the spaces' }));
    expect(screen.queryByRole('button', { name: 'close up the spaces' })).toBeNull();
  });

  it('speaks Dutch on a Dutch phone and guesses a Dutch poem', async () => {
    const store = await freshStore();
    renderApp(store, 'nl');
    fireEvent.click(await screen.findByRole('button', { name: 'voeg een gedicht toe' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Het Eenzame Vogeltje\n\nIk hoor een vogeltje fluiten,\nin het verre, verre woud' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'zet de bladzijde' }));
    expect(screen.queryByText('Is dit gedicht in het Engels of in het Nederlands?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'bewaar het' }));
    await screen.findByRole('button', { name: /Het Eenzame Vogeltje/ });
    expect((await store.poems.list())[0]?.language).toBe('nl');
  });

  it('asks the language only when the words leave it unclear', async () => {
    const store = await freshStore();
    renderApp(store);
    fireEvent.click(await screen.findByRole('button', { name: 'add a poem' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Stilte\n\nwind\nwater\nlicht' } });
    fireEvent.click(screen.getByRole('button', { name: 'set the page' }));
    expect(screen.getByText('Is this poem in English or Dutch?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Nederlands' }));
    fireEvent.click(screen.getByRole('button', { name: 'keep it' }));
    await screen.findByRole('button', { name: /Stilte/ });
    expect((await store.poems.list())[0]?.language).toBe('nl');
  });

  it('says which poems are fading today', async () => {
    const store = await freshStore();
    const poem = await store.poems.add({ title: 'Hope', poet: '', language: 'en', text: 'a line\nanother' });
    await store.poems.add({ title: 'New', poet: '', language: 'en', text: 'a line' });
    const now = new Date();
    const card = { ...review(undefined, Rating.Good, new Date(now.getTime() - 9 * 86_400_000)), state: State.Review, due: now };
    await store.schedule.save(poem.id, [{ unit: stanzaUnit(0), card, grade: Rating.Good }], now);
    renderApp(store);
    const fading = await screen.findByText('fading');
    expect(fading.closest('button')?.textContent).toContain('Hope');
    expect(fading.className).toContain('fading');
    expect(screen.getByText('taking root').closest('button')?.textContent).toContain('New');
  });
});
