import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nFor, I18nContext } from '../i18n/context';
import { createStore, type Store } from '../store';
import { StoreContext } from '../store/context';
import { migrate } from '../store/migrations';
import type { Poem } from '../store/poems';
import { openSqlJs } from '../store/sqljs';
import { PoemPage } from './PoemPage';
import { letterBox } from '../testing/letters';

const HOPE = [
  '“Hope” is the thing with feathers -',
  'That perches in the soul -',
  'And sings the tune without the words -',
  'And never stops - at all -',
].join('\n');

async function storeWithPoem(text = HOPE, language: Poem['language'] = 'en') {
  const db = await openSqlJs();
  await migrate(db);
  const store = createStore(db);
  const poem = await store.poems.add({ title: 'Hope', poet: 'Emily Dickinson', language, text });
  return { store, poem };
}

const show = (store: Store, poem: Poem, locale: 'en' | 'nl' = 'en') =>
  render(
    <I18nContext.Provider value={i18nFor(locale)}>
      <StoreContext.Provider value={store}>
        <PoemPage poem={poem} onBack={() => {}} />
      </StoreContext.Provider>
    </I18nContext.Provider>,
  );

const glyph = (line: number, at: number) => {
  const el = document.querySelector(`[data-line="${line}"] [data-at="${at}"]`);
  if (!el) throw new Error(`no letter ${at} on line ${line}`);
  return el;
};

const syllables = (line: number, kind: 'beat' | 'light') =>
  Array.from(document.querySelectorAll(`[data-line="${line}"] .syl.${kind}`), (s) => s.textContent);

/** Opens the pencil and puts the first lesson away. */
async function takeUpPencil() {
  const mark = await screen.findByRole('button', { name: 'mark what you hear' });
  await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(false), { timeout: 5000 });
  fireEvent.click(mark);
  await screen.findByRole('dialog', { name: 'beats' });
  fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
}

const stroke = (line: number, from: number, to: number) => {
  fireEvent.pointerDown(glyph(line, from), { clientX: from * 12 + 6 });
  fireEvent.pointerMove(glyph(line, to), { clientX: to * 12 + 6 });
  fireEvent.pointerUp(glyph(line, to), { clientX: to * 12 + 6 });
};

describe('the pencil', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return letterBox(this) ?? ({ width: 200 } as DOMRect);
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(330);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows how to mark just above the bar, until the first mark is down', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await takeUpPencil();
    const note = await waitFor(() => {
      const found = document.querySelector('.stage-foot .note');
      expect(found?.textContent).toMatch(/Choose beats, echoes or pauses/);
      return found;
    });
    expect(note).toBeTruthy();
    fireEvent.click(glyph(1, 1));
    expect(document.querySelector('.stage-foot .note')).toBeNull();
  });

  it('teaches beats the first time it is taken up, and only then', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    const mark = await screen.findByRole('button', { name: 'mark what you hear' });
    await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(false), { timeout: 5000 });
    fireEvent.click(mark);
    await screen.findByRole('dialog', { name: 'beats' });
    // Put away after opening by itself, it shows where it lives: about beats draws the eye once.
    fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
    expect(screen.getByRole('button', { name: 'about beats' }).className).toContain('beckon');
    expect(await store.seen.has('lesson:beats')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'about beats' }));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark what you hear' }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks beats with a tap, settles a line when the reader moves on, and keeps them', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await takeUpPencil();

    fireEvent.click(glyph(1, 2)); // Hope
    fireEvent.click(glyph(1, 15)); // thing
    expect(syllables(1, 'beat')).toEqual(['Hope', 'thing']);
    // While a line is being marked, nothing else is shown.
    expect(syllables(1, 'light')).toEqual([]);

    fireEvent.click(glyph(2, 6)); // per
    expect(syllables(1, 'light')).toEqual(['is', 'the', 'with', 'feath', 'ers']);
    expect(syllables(2, 'light')).toEqual([]);

    // A tap on a light syllable turns it into a beat; a second tap takes it away again.
    fireEvent.click(glyph(1, 26));
    expect(syllables(1, 'beat')).toContain('feath');
    fireEvent.click(glyph(1, 15));
    expect(syllables(1, 'beat')).not.toContain('thing');
    expect(syllables(1, 'light')).toContain('thing');

    // Tapping empty paper settles the line being marked.
    fireEvent.click(screen.getByRole('heading', { name: 'Hope' }));
    expect(syllables(2, 'light').length).toBeGreaterThan(0);

    await waitFor(async () => expect((await store.marks.get(poem.id)).settled).toEqual([1, 2]));
    // Reading shows the poem clean; taking up the pencil again brings the marks back.
    cleanup();
    show(store, poem);
    const mark = await screen.findByRole('button', { name: 'mark what you hear' });
    await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(false), { timeout: 5000 });
    expect(syllables(1, 'beat')).toEqual([]);
    fireEvent.click(mark);
    expect(syllables(1, 'beat')).toEqual(['Hope', 'feath']);
  });

  it('marks pauses on punctuation, or after the word tapped', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await takeUpPencil();
    fireEvent.click(screen.getByRole('button', { name: 'pauses' }));
    await screen.findByRole('dialog', { name: 'pauses' });
    fireEvent.click(screen.getByRole('button', { name: 'put it away' }));

    fireEvent.click(glyph(2, 21)); // soul → the dash after it
    fireEvent.click(glyph(3, 25)); // without → the space after it
    expect(Array.from(document.querySelectorAll('.pause'), (p) => p.className)).toEqual(['stop pause', 'gap pause']);
    // A tap on the stop itself takes the pause away again.
    fireEvent.click(glyph(2, 25));
    expect(document.querySelectorAll('.stop.pause')).toHaveLength(0);
  });

  it('draws echoes under letters, rubs them out with a tap, and letters the rhymes', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await takeUpPencil();
    fireEvent.click(screen.getByRole('button', { name: 'echoes' }));
    await screen.findByRole('dialog', { name: 'echoes' });
    fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
    // A blank poem offers one pen; another comes once the first has a sound.
    expect(Array.from(screen.getByRole('group', { name: 'underlines' }).children, (b) => b.getAttribute('aria-label'))).toEqual([
      'dotted underline',
    ]);

    stroke(2, 23, 21); // the oul of soul, drawn backwards
    expect(document.querySelectorAll('.rhyme')).toHaveLength(0);
    stroke(4, 22, 23); // the ll of all
    expect(Array.from(document.querySelectorAll('.verse .echo-1'), (e) => e.textContent)).toEqual(['oul', 'll']);
    expect(Array.from(document.querySelectorAll('.rhyme'), (r) => r.textContent)).toEqual(['a', 'a']);
    // The words the pen has underlined, so the reader can tell which sound it holds.
    expect(document.querySelector('.echo-words')?.textContent).toBe('soul · all');
    // The pen stays in one family, so the first time it spans two lines, a fresh underline draws the eye.
    await waitFor(() => expect(screen.getByRole('button', { name: 'dashed underline' }).className).toContain('beckon'));

    // One tap on an underline rubs out the whole echo, and the letters go with it.
    stroke(4, 23, 23);
    expect(Array.from(document.querySelectorAll('.verse .echo-1'), (e) => e.textContent)).toEqual(['oul']);
    expect(document.querySelectorAll('.rhyme')).toHaveLength(0);

    // A rhyme sounds in the last syllable: an echo earlier in the last word doesn't close the line.
    stroke(1, 26, 27); // the ea of feathers
    stroke(4, 22, 23);
    expect(Array.from(document.querySelectorAll('[data-line="1"] .rhyme'))).toEqual([]);
    expect(Array.from(document.querySelectorAll('.rhyme'), (r) => r.textContent)).toEqual(['a', 'a']);
    stroke(1, 31, 32); // the rs of feathers
    expect(Array.from(document.querySelectorAll('.rhyme'), (r) => r.textContent)).toEqual(['a', 'a', 'a']);
    stroke(1, 31, 31);
    stroke(1, 26, 26);
    stroke(4, 23, 23);

    // A tap on a bare letter underlines just that letter.
    fireEvent.click(screen.getByRole('button', { name: 'dashed underline' }));
    stroke(3, 4, 4);
    expect(document.querySelector('.verse .echo-2')?.textContent).toBe('s');
    // A thumb that rolls a little onto the next letter still underlines only the one it came down on.
    fireEvent.pointerDown(glyph(3, 10), { clientX: 100, clientY: 50 });
    fireEvent.pointerMove(glyph(3, 11), { clientX: 106, clientY: 53 });
    fireEvent.pointerUp(glyph(3, 11), { clientX: 106, clientY: 53 });
    expect(Array.from(document.querySelectorAll('.verse .echo-2'), (e) => e.textContent)).toEqual(['s', 't']);
    await waitFor(async () => expect((await store.marks.get(poem.id)).echoes).toHaveLength(3));

    // A stroke drawn where the underline goes, just below the letters, underlines the letters above it.
    const lineText = (line: number) => document.querySelector(`[data-line="${line}"] .line-text`)!;
    const below = 2 * 30 + 25; // line 2's letters end at 80, line 3's start at 90
    fireEvent.pointerDown(lineText(2), { clientX: 21 * 12 + 6, clientY: below });
    fireEvent.pointerMove(lineText(2), { clientX: 23 * 12 + 6, clientY: below });
    fireEvent.pointerUp(lineText(2), { clientX: 23 * 12 + 6, clientY: below });
    expect(Array.from(document.querySelectorAll('[data-line="2"] .echo-2'), (e) => e.textContent)).toEqual(['oul']);
  });

  it('lets the reader re-cut a word with a long press', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await takeUpPencil();

    fireEvent.pointerDown(glyph(1, 27));
    await screen.findByRole('dialog', { name: 'syllables' }, { timeout: 2000 });
    fireEvent.pointerUp(glyph(1, 27));
    // The guess is feath|ers; split it after fea instead.
    const splits = screen.getAllByRole('button', { name: 'split here' });
    expect(splits.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'false', 'true', 'false', 'false']);
    fireEvent.click(splits[4]!);
    fireEvent.click(splits[2]!);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'put it away' }));
    });
    expect(Array.from(document.querySelectorAll('[data-line="1"] .syl'), (s) => s.textContent)).toContain('thers');
    await waitFor(async () => expect((await store.marks.get(poem.id)).splits).toEqual({ 1: { 25: [3] } }));
  });

  it('teaches in the interface language, with the poem in its own', async () => {
    const { store, poem } = await storeWithPoem('O krinklende winklende waterding\nmet ’t zwarte kabotseken aan', 'nl');
    show(store, poem, 'nl');
    fireEvent.click(await screen.findByRole('button', { name: 'markeer wat je hoort' }));
    expect(await screen.findByRole('dialog', { name: 'klemtonen' })).toBeTruthy();
    expect(screen.getByText(/KRINK-len-de/)).toBeTruthy();
    expect(Array.from(document.querySelectorAll('[data-line="1"] .syl'), (s) => s.textContent)).toEqual([
      'O',
      'krink',
      'len',
      'de',
      'wink',
      'len',
      'de',
      'wa',
      'ter',
      'ding',
    ]);
  });
});
