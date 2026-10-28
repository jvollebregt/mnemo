import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Rating, State } from 'ts-fsrs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { review, stanzaUnit } from '../learn/schedule';
import type { Ear } from '../recite/ear';
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

const show = (store: Store, poem: Poem, onBack = () => {}, ear?: Ear) =>
  render(
    <StoreContext.Provider value={store}>
      <PoemPage poem={poem} onBack={onBack} ear={ear} />
    </StoreContext.Provider>,
  );

/** An ear that hears whatever the test says, and can be refused the microphone. */
function fakeEar() {
  let heard: ((text: string) => void) | undefined;
  let stopped: ((problem?: string) => void) | undefined;
  const ear: Ear = {
    available: true,
    listen: (_language, onHeard, onStop) => {
      heard = onHeard;
      stopped = onStop;
      return { stop: () => stopped?.() };
    },
  };
  return { ear, say: (text: string) => act(() => heard?.(text)), refuse: () => act(() => stopped?.('not-allowed')) };
}

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

  it('brings a faded word back in pencil, and keeps it marked when the recital is done', async () => {
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

    // A second tap fades it again, but it still counts as looked at.
    fireEvent.click(glyph(2, 22));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:gone']);

    fireEvent.click(action('done'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul:peek', '-:ink']);
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
    expect(await screen.findByText(/Type it from memory/)).toBeTruthy();
    fireEvent.click(glyph(2, 22)); // a peek at soul

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
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page', 'done']) fireEvent.click(action(name));

    fireEvent.click(action('not yet'));
    expect(screen.getByRole('button', { name: 'marks only' })).toBeTruthy();

    for (const name of ['marks only', 'fade the marks', 'blank page', 'done', 'all of it']) fireEvent.click(action(name));
    expect(document.querySelector('[data-line="1"]')).toBeNull();
    expect(document.querySelector('[data-line="5"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'stanza 2' }).getAttribute('aria-pressed')).toBe('true');

    // The stanza numbers lead back too.
    fireEvent.click(action('stanza 1'));
    expect(document.querySelector('[data-line="1"]')).toBeTruthy();
    fireEvent.click(action('stanza 2'));
    fireEvent.click(action('mark what you hear'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page', 'done', 'most of it']) {
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

    // Every stanza, and each line recited, now has its place in the schedule.
    await waitFor(async () => {
      const units = [...(await store.schedule.cards(poem.id)).keys()];
      expect(units.filter((u) => u.startsWith('stanza'))).toEqual(['stanza:0', 'stanza:1']);
    });
  });

  it('brings a due stanza back before anything new, as far along the fade as it is likely still known', async () => {
    const { store, poem } = await storeWithPoem();
    const now = new Date();
    // Last recited two months ago and hardly settled then: likely half gone.
    const due = {
      ...review(undefined, Rating.Good, new Date(now.getTime() - 60 * 86_400_000)),
      state: State.Review,
      stability: 5,
      due: now,
    };
    await store.schedule.save(poem.id, [{ unit: stanzaUnit(1), card: due, grade: Rating.Good }], now);
    await store.schedule.save(poem.id, [{ unit: stanzaUnit(0), card: { ...due, due: new Date(now.getTime() + 5 * 86_400_000) }, grade: Rating.Good }], now);
    show(store, poem);

    expect(await screen.findByText(/Try it before you look/)).toBeTruthy();
    expect(document.querySelector('[data-line="1"]')).toBeNull();
    expect(document.querySelector('[data-line="5"]')).toBeTruthy();
    // It opens on the marks alone, so the way on is to fade them.
    expect(action('fade the marks')).toBeTruthy();
  });

  it('listens to the recital by default, and lets the reader type instead', async () => {
    const { store, poem } = await storeWithPoem();
    const { ear, say, refuse } = fakeEar();
    show(store, poem, () => {}, ear);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'blank page']) fireEvent.click(action(name));
    expect(await screen.findByText(/Say it aloud from memory/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();

    fireEvent.click(action('say it'));
    expect(screen.getByText('listening…')).toBeTruthy();
    say('hope is the thing with feathers that perches');
    expect(screen.getByText('hope is the thing with feathers that perches')).toBeTruthy();
    expect(looks(2)[0]).toBe('That:ink');

    // When the microphone is refused, typing takes over, carrying on from what was heard.
    refuse();
    expect(screen.getByText(/can’t listen here/)).toBeTruthy();
    const typing = screen.getByRole('textbox', { name: 'recite' }) as HTMLTextAreaElement;
    expect(typing.value).toBe('hope is the thing with feathers that perches');

    // The reader can choose either way, and the choice is kept.
    fireEvent.click(action('speak instead'));
    fireEvent.click(action('type instead'));
    await waitFor(async () => expect(await store.settings.reciteBy()).toBe('typing'));
    fireEvent.click(action('done'));
    expect(looks(2)).toEqual(['Thatperches:ink', 'inthesoul:peek', '-:ink']);
  });
});
