import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { SettingsPage } from './SettingsPage';
import { i18nFor, I18nContext } from '../i18n/context';
import type { Locale } from '../i18n';
import { createStore, type Store } from '../store';
import { StoreContext } from '../store/context';
import { migrate } from '../store/migrations';
import { openSqlJs } from '../store/sqljs';

async function freshStore(): Promise<Store> {
  const db = await openSqlJs();
  await migrate(db);
  return createStore(db);
}

const renderApp = (store: Store, locale: Locale = 'en') =>
  render(
    <I18nContext.Provider value={i18nFor(locale)}>
      <StoreContext.Provider value={store}>
        <App />
      </StoreContext.Provider>
    </I18nContext.Provider>,
  );

const action = (name: string) => screen.getByRole('button', { name });

async function openSettings(store: Store, locale: Locale = 'en') {
  renderApp(store, locale);
  fireEvent.click(await screen.findByRole('button', { name: /^(settings|instellingen)$/ }));
}

describe('the settings page', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('lets the reader choose the interface language, and keeps it', async () => {
    const store = await freshStore();
    await openSettings(store, 'nl');
    fireEvent.click(await screen.findByRole('button', { name: 'English' }));
    expect(screen.getByRole('heading', { name: 'settings' })).toBeTruthy();
    await waitFor(async () => expect(await store.settings.locale()).toBe('en'));

    cleanup();
    await openSettings(store, 'nl');
    expect((await screen.findByRole('button', { name: 'English' })).getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps how the reader likes to recite', async () => {
    const store = await freshStore();
    await openSettings(store);
    // jsdom can't listen, so typing is what it starts from.
    await waitFor(() => expect(action('by typing').getAttribute('aria-pressed')).toBe('true'));
    fireEvent.click(action('aloud'));
    await waitFor(async () => expect(await store.settings.reciteBy()).toBe('speaking'));
  });

  it('lets recitals go by default, keeps them on request, and clears them on a second tap', async () => {
    const store = await freshStore();
    const poem = await store.poems.add({ title: 'Hope', poet: '', language: 'en', text: 'a line' });
    const page = () => (
      <I18nContext.Provider value={i18nFor('en')}>
        <StoreContext.Provider value={store}>
          <SettingsPage canSpeak canRecord onLocale={() => {}} onBack={() => {}} onImported={() => {}} />
        </StoreContext.Provider>
      </I18nContext.Provider>
    );
    render(page());
    await waitFor(() => expect(action('let them go').getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByText('No recitals are kept.')).toBeTruthy();
    fireEvent.click(action('keep the latest'));
    await waitFor(async () => expect(await store.settings.keepRecitals()).toBe(true));

    await store.recordings.keep(poem.id, new Uint8Array(1_500_000), 'audio/webm');
    cleanup();
    render(page());
    expect(await screen.findByText(/Your recitals take 1.5 MB/)).toBeTruthy();
    fireEvent.click(action('clear recordings'));
    expect(await store.recordings.bytesUsed()).toBe(1_500_000);
    await act(async () => fireEvent.click(action('yes, clear them')));
    expect(await store.recordings.bytesUsed()).toBe(0);
    expect(screen.getByText('No recitals are kept.')).toBeTruthy();
  });

  it('says when this device can’t keep recitals', async () => {
    await openSettings(await freshStore());
    expect(await screen.findByText(/isn’t possible on this phone yet/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'keep the latest' })).toBeNull();
  });

  it('reads poems in from an export file, and says when a file is not one', async () => {
    const from = await freshStore();
    await from.poems.add({ title: 'Hope', poet: '', language: 'en', text: 'a line' });
    const text = await from.exchange.export();

    const store = await freshStore();
    await openSettings(store);
    const picker = screen.getByLabelText('import') as HTMLInputElement;
    await act(async () => fireEvent.change(picker, { target: { files: [new File([text], 'mnemo.json')] } }));
    expect(await screen.findByText(/Poems read in from the file: 1/)).toBeTruthy();
    fireEvent.click(action('contents'));
    expect(await screen.findByText('Hope')).toBeTruthy();

    fireEvent.click(action('settings'));
    const again = (await screen.findByLabelText('import')) as HTMLInputElement;
    await act(async () => fireEvent.change(again, { target: { files: [new File(['hello'], 'notes.txt')] } }));
    expect(await screen.findByText(/not a Mnemo export/)).toBeTruthy();
  });

  it('hands the export file over as a download in the browser', async () => {
    const store = await freshStore();
    await store.poems.add({ title: 'Hope', poet: '', language: 'en', text: 'a line' });
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await openSettings(store);
    await act(async () => fireEvent.click(action('export')));
    await waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^mnemo-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
