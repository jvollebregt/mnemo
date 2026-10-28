import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Store } from '../store';
import { StoreContext } from '../store/context';
import { migrate } from '../store/migrations';
import type { Poem } from '../store/poems';
import { openSqlJs } from '../store/sqljs';
import { PoemPage } from './PoemPage';

const HOPE = [
  '“Hope” is the thing with feathers -',
  'That perches in the soul -',
  'And sings the tune without the words -',
  'And never stops - at all -',
  '',
  'And sweetest - in the Gale - is heard -',
  'And sore must be the storm -',
].join('\n');

async function storeWithPoem() {
  const db = await openSqlJs();
  await migrate(db);
  const store = createStore(db);
  const poem = await store.poems.add({ title: 'Hope', poet: 'Emily Dickinson', language: 'en', text: HOPE });
  return { store, poem };
}

const show = (store: Store, poem: Poem, onBack = () => {}) =>
  render(
    <StoreContext.Provider value={store}>
      <PoemPage poem={poem} onBack={onBack} />
    </StoreContext.Provider>,
  );

const action = (name: string) => screen.getByRole('button', { name });
const glyph = (line: number, at: number) => document.querySelector(`[data-line="${line}"] [data-at="${at}"]`)!;
/** How each run of letters in a line is set: "text:look". */
const looks = (line: number) =>
  Array.from(document.querySelectorAll(`[data-line="${line}"] .line-text [data-at]`))
    .map((g) => ({ ch: g.textContent!, look: ['trace', 'gone', 'peek'].find((c) => g.parentElement!.classList.contains(c)) ?? 'ink' }))
    .filter((g) => g.ch.trim())
    .reduce<string[]>((runs, g, i, all) => {
      if (i > 0 && all[i - 1]!.look === g.look) runs[runs.length - 1] = runs[runs.length - 1]!.replace(/:/, `${g.ch}:`);
      else runs.push(`${g.ch}:${g.look}`);
      return runs;
    }, []);

async function ready() {
  const mark = await screen.findByRole('button', { name: 'mark what you hear' });
  await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(false), { timeout: 5000 });
}

describe('the stages', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 200 }) as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(330);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fade the words, then leave only the marks, then the shapes, then nothing', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    expect(screen.getByText(/Read it aloud/)).toBeTruthy();
    // One stanza at a time.
    expect(document.querySelector('[data-line="5"]')).toBeNull();

    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    fireEvent.click(glyph(2, 6)); // per
    fireEvent.click(action('pauses'));
    await screen.findByRole('dialog', { name: 'pauses' });
    fireEvent.click(action('put it away'));
    fireEvent.click(glyph(2, 25)); // the dash after soul

    fireEvent.click(action('fade the words'));
    expect(looks(2)).toEqual(['T:ink', 'hat:trace', 'p:ink', 'erches:trace', 'i:ink', 'n:trace', 't:ink', 'he:trace', 's:ink', 'oul:trace', '-:ink']);
    expect(document.querySelectorAll('[data-line="2"] .syl.beat')).toHaveLength(1);
    // Punctuation the reader didn't mark fades with the words.
    expect(looks(1).at(-1)).toBe('eathers-:trace');
    expect(await screen.findByText(/The words fade; your marks stay/)).toBeTruthy();

    fireEvent.click(action('marks only'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul:trace', '-:ink']);
    expect(document.querySelectorAll('[data-line="2"] .syl.beat')).toHaveLength(1);

    fireEvent.click(action('fade the marks'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:trace']);
    expect(document.querySelectorAll('.syl.beat, .pause')).toHaveLength(0);

    fireEvent.click(action('blank page'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:gone']);

    // Back goes one stage back.
    fireEvent.click(action('back'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:trace']);
  });

  it('brings a faded word back in pencil, and keeps it marked in the check', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page']) fireEvent.click(action(name));

    fireEvent.click(glyph(2, 22));
    expect(looks(2)).toEqual(['Thatperchesinthe:gone', 'soul:peek', '-:gone']);
    expect(await screen.findByText(/Peeking is fine/)).toBeTruthy();

    fireEvent.click(action('check'));
    expect(looks(2)).toEqual(['Thatperchesinthe:gone', 'soul:peek', '-:gone']);
    expect(await store.seen.has('note:peek')).toBe(true);
  });

  it('brings words back in ink as they are typed, and what was missed in pencil', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page']) fireEvent.click(action(name));
    fireEvent.click(glyph(2, 22)); // a peek at soul
    fireEvent.click(action('check'));
    expect(await screen.findByText(/Type it from memory/)).toBeTruthy();

    const recite = screen.getByRole('textbox', { name: 'recite' });
    fireEvent.change(recite, { target: { value: 'Hope is the thing with feathers - that perches in soul' } });
    // A word counts once the reader has moved past it.
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'the:gone', 'soul:peek', '-:gone']);
    expect(looks(1)).toEqual(['“:gone', 'Hope:ink', '”:gone', 'isthethingwithfeathers:ink', '-:gone']);

    fireEvent.click(action('done'));
    expect(screen.queryByRole('textbox', { name: 'recite' })).toBeNull();
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'thesoul:peek', '-:ink']);
    expect(looks(3)[0]).toBe('Andsingsthetunewithoutthewords:peek');
    expect(await screen.findByText(/What you missed is in pencil/)).toBeTruthy();

    // A tap says the reader did have a word; a word peeked at stays in pencil.
    fireEvent.click(glyph(2, 17));
    fireEvent.click(glyph(2, 22));
    expect(looks(2)).toEqual(['Thatperchesinthe:ink', 'soul:peek', '-:ink']);
  });

  it('moves on to the next stanza, then the seam, then both together', async () => {
    const { store, poem } = await storeWithPoem();
    const onBack = vi.fn();
    show(store, poem, onBack);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page', 'check', 'done']) fireEvent.click(action(name));

    fireEvent.click(action('not yet'));
    expect(screen.getByRole('button', { name: 'marks only' })).toBeTruthy();

    for (const name of ['marks only', 'fade the marks', 'blank page', 'check', 'done', 'all of it']) fireEvent.click(action(name));
    expect(document.querySelector('[data-line="1"]')).toBeNull();
    expect(document.querySelector('[data-line="5"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'stanza 2' }).getAttribute('aria-pressed')).toBe('true');

    // The stanza numbers lead back too.
    fireEvent.click(action('stanza 1'));
    expect(document.querySelector('[data-line="1"]')).toBeTruthy();
    fireEvent.click(action('stanza 2'));
    fireEvent.click(action('mark what you hear'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page', 'check', 'done', 'most of it']) {
      fireEvent.click(action(name));
    }

    // The seam: the last line of the first stanza and the first of the second, recited straight away.
    expect(Array.from(document.querySelectorAll('[data-line]'), (l) => l.getAttribute('data-line'))).toEqual(['4', '5']);
    expect(screen.getByRole('textbox', { name: 'recite' })).toBeTruthy();
    expect(await screen.findByText(/join between two stanzas/)).toBeTruthy();
    expect(['stanza 1', 'stanza 2'].map((name) => action(name).getAttribute('aria-pressed'))).toEqual(['true', 'true']);
    fireEvent.click(action('done'));
    fireEvent.click(action('all of it'));

    // Then both stanzas together.
    expect(document.querySelectorAll('[data-line]')).toHaveLength(6);
    expect(await screen.findByText(/stanzas so far, together/)).toBeTruthy();
    fireEvent.click(action('done'));
    fireEvent.click(action('most of it'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
