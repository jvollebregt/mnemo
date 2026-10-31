import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Rating, State } from 'ts-fsrs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { review, stanzaUnit } from '../learn/schedule';
import type { Ear } from '../recite/ear';
import type { Recorder } from '../recite/recorder';
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
  '',
  'And sweetest - in the Gale - is heard -',
  'And sore must be the storm -',
  'That could abash the little Bird',
  'That kept so many warm -',
  '',
  'I’ve heard it in the chillest land -',
  'And on the strangest Sea -',
  'Yet - never - in Extremity,',
  'It asked a crumb - of me.',
].join('\n');

async function storeWithPoem() {
  const db = await openSqlJs();
  await migrate(db);
  const store = createStore(db);
  const poem = await store.poems.add({ title: 'Hope', poet: 'Emily Dickinson', language: 'en', text: HOPE });
  return { store, poem };
}

const show = (store: Store, poem: Poem, onBack = () => {}, ear?: Ear, recorder?: Recorder) =>
  render(
    <StoreContext.Provider value={store}>
      <PoemPage poem={poem} onBack={onBack} ear={ear} recorder={recorder} />
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

/** The lines set in full, not faint around them. */
const stroke = (line: number, from: number, to: number) => {
  fireEvent.pointerDown(glyph(line, from), { clientX: from * 12 + 6 });
  fireEvent.pointerMove(glyph(line, to), { clientX: to * 12 + 6 });
  fireEvent.pointerUp(glyph(line, to), { clientX: to * 12 + 6 });
};
const inHand = () => Array.from(document.querySelectorAll('[data-line]:not(.faint)'), (l) => l.getAttribute('data-line'));
const stanza = (n: number) => document.querySelector(`[data-stanza="${n}"]`)!;

async function ready() {
  const mark = await screen.findByRole('button', { name: 'mark what you hear' });
  await waitFor(() => expect((mark as HTMLButtonElement).disabled).toBe(false), { timeout: 5000 });
}

describe('the stages', () => {
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

  it('fade the words, then leave only the marks, then the shapes, then nothing', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    expect(screen.getByText(/Read it aloud/)).toBeTruthy();
    // The whole poem, all in ink, to read through.
    expect(inHand()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);

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

    // The recital: nothing on the page, not even the shapes of the other stanzas.
    fireEvent.click(action('recite'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:gone']);
    expect(looks(5)).toEqual(['Andsweetest-intheGale-isheard-:gone']);

    // Back goes one stage back.
    fireEvent.click(action('back'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:trace']);
  });

  it('marks the whole poem stanza by stanza, and fades the stanza in hand', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    // The whole poem is on the page while marking: the stanza in hand in ink, the next one faint.
    expect(stanza(0).className).toContain('in-focus');
    expect(stanza(1).className).toContain('faint');
    fireEvent.click(glyph(2, 6)); // per
    expect(document.querySelectorAll('[data-line="2"] .syl.beat')).toHaveLength(1);

    // A tap on a faint stanza only moves the pencil there.
    fireEvent.click(glyph(6, 4));
    expect(document.querySelectorAll('[data-line="6"] .syl.beat')).toHaveLength(0);
    expect(stanza(0).className).toContain('faint');
    expect(stanza(1).className).toContain('in-focus');
    // Still the pencil.
    expect(action('beats')).toBeTruthy();
    fireEvent.click(glyph(6, 4)); // sweet
    expect(document.querySelectorAll('[data-line="6"] .syl.beat')).toHaveLength(1);

    // Fading takes the stanza in hand, with its marks; the rest of the poem is only traces of its line shapes.
    fireEvent.click(action('fade the words'));
    expect(inHand()).toEqual(['5', '6', '7', '8']);
    expect(looks(6)[0]).toBe('A:ink');
    expect(document.querySelectorAll('[data-line="6"] .syl.beat')).toHaveLength(1);
    expect(looks(2).every((run) => run.endsWith(':trace'))).toBe(true);
    expect(document.querySelectorAll('[data-line="2"] .syl.beat')).toHaveLength(0);
    expect((await store.marks.get(poem.id)).settled).toEqual(expect.arrayContaining([2, 6]));

    // Back to the pencil: it stays with the stanza in hand while that has lines whose beats are still to do.
    fireEvent.click(action('back'));
    expect(stanza(1).className).toContain('in-focus');
  });

  it('brings faded words back in pencil on the practice pages, by a tap or a stroke, but not at the recital', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    fireEvent.click(action('echoes'));
    await screen.findByRole('dialog', { name: 'echoes' });
    fireEvent.click(action('put it away'));
    stroke(2, 21, 23); // the oul of soul
    fireEvent.click(action('fade the words'));
    expect(await screen.findByText(/The words fade/)).toBeTruthy();

    // A tap brings back the whole word, underlined or not, and a second tap fades it again.
    fireEvent.click(glyph(2, 22));
    expect(looks(2).slice(-2)).toEqual(['soul:peek', '-:trace']);
    expect(await screen.findByText(/Peeking is fine here/)).toBeTruthy();
    fireEvent.click(glyph(2, 22));
    expect(looks(2).slice(-2)).toEqual(['s:ink', 'oul-:trace']);

    // The other stanzas can be read too.
    fireEvent.click(action('marks only'));
    fireEvent.click(action('fade the marks'));
    fireEvent.click(glyph(6, 4));
    expect(looks(6).slice(0, 2)).toEqual(['And:trace', 'sore:peek']);

    // A finger drawn along a line brings back every word it passes, and drawn again, lets them go.
    const under = vi.fn((x: number) => glyph(1, Math.floor(x / 12)));
    document.elementFromPoint = under as unknown as typeof document.elementFromPoint;
    const draw = (from: number, to: number) => {
      fireEvent.pointerDown(glyph(1, from), { clientX: from * 12 + 6, clientY: 10 });
      for (let at = from + 1; at <= to; at += 1) fireEvent.pointerMove(glyph(1, from), { clientX: at * 12 + 6, clientY: 10 });
      fireEvent.pointerUp(glyph(1, from), { clientX: to * 12 + 6, clientY: 10 });
      fireEvent.click(glyph(1, from));
    };
    draw(1, 16); // Hope … thing
    expect(looks(1)).toEqual(['“:trace', 'Hope:peek', '”:trace', 'isthething:peek', 'withfeathers-:trace']);
    draw(1, 16);
    expect(looks(1)).toEqual(['“Hope”isthethingwithfeathers-:trace']);
    // Drawn from beside the words, the stroke does what the first word it reaches needs.
    draw(0, 16);
    expect(looks(1)).toEqual(['“:trace', 'Hope:peek', '”:trace', 'isthething:peek', 'withfeathers-:trace']);
    draw(0, 16);
    expect(looks(1)).toEqual(['“Hope”isthethingwithfeathers-:trace']);

    // At the recital, nothing comes back.
    fireEvent.click(action('recite'));
    fireEvent.click(glyph(2, 22));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:gone']);
  });

  it('brings words back in ink as they are typed, what was gone past in pencil, and asks about a miss', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'recite']) fireEvent.click(action(name));
    expect(await screen.findByText(/from memory, with nothing to look at/)).toBeTruthy();

    const recite = screen.getByRole('textbox', { name: 'recite' });
    fireEvent.change(recite, { target: { value: 'Hope is the thing with feathers - that perches in soul' } });
    // A typed word counts once the reader has moved past it.
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'thesoul-:gone']);
    // One gone past without being said shows in pencil at once.
    fireEvent.change(recite, { target: { value: 'Hope is the thing with feathers - that perches in soul -' } });
    // Punctuation comes back with its word.
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'the:peek', 'soul-:ink']);
    expect(looks(1)).toEqual(['“Hope”isthethingwithfeathers-:ink']);

    fireEvent.click(action('done'));
    expect(screen.queryByRole('textbox', { name: 'recite' })).toBeNull();
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'the:peek', 'soul-:ink']);
    expect(looks(3)).toEqual(['Andsingsthetunewithoutthewords-:peek']);
    expect(await screen.findByText(/What you missed is in pencil/)).toBeTruthy();

    // A tap on a word in pencil says what was heard there, and the reader can count it as said.
    fireEvent.click(glyph(2, 17));
    expect(screen.getByText('I heard nothing here')).toBeTruthy();
    fireEvent.click(action('I said that'));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:ink']);
    // A second tap puts it back in pencil.
    fireEvent.click(glyph(2, 17));
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'the:peek', 'soul-:ink']);

    // The reader judges how it went, or first tries again on a clear page.
    expect(screen.getByText('How much of it did you know?')).toBeTruthy();
    fireEvent.click(action('again'));
    expect((screen.getByRole('textbox', { name: 'recite' }) as HTMLTextAreaElement).value).toBe('');
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:gone']);
    expect(screen.queryByRole('button', { name: 'all of it' })).toBeNull();
  });

  it('keeps the furthest page reached at the foot, so going back never means going all the way through again', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'back', 'back']) fireEvent.click(action(name));
    // Back on fade the words: the next page, and the furthest one reached.
    expect(screen.getByRole('button', { name: 'marks only' })).toBeTruthy();
    fireEvent.click(action('fade the marks'));
    fireEvent.click(action('recite'));
    fireEvent.click(action('back'));
    // The numeral leads back to the whole poem, where recite returns to the recital left.
    fireEvent.click(action('stanza 1'));
    expect(screen.getByRole('button', { name: 'mark what you hear' })).toBeTruthy();
    fireEvent.click(action('recite'));
    expect(screen.getByRole('textbox', { name: 'recite' })).toBeTruthy();
  });

  it('fades the nearest marked stanza when the one in hand has no marks yet', async () => {
    const { store, poem } = await storeWithPoem();
    await store.marks.save(poem.id, { ...(await store.marks.get(poem.id)), settled: [1, 2, 3, 4] });
    show(store, poem);
    await ready();
    fireEvent.click(action('mark what you hear'));
    // The pencil opens on the stanza in hand, wherever the marking got to.
    expect(stanza(0).className).toContain('in-focus');
    fireEvent.click(stanza(1));
    expect(stanza(1).className).toContain('in-focus');
    fireEvent.click(action('fade the words'));
    expect(inHand()).toEqual(['1', '2', '3', '4']);
  });

  it('moves on to the next stanza, and recites it together with the one learned before', async () => {
    const { store, poem } = await storeWithPoem();
    show(store, poem);
    await ready();
    // Nothing is learned yet, so there is nothing to recite whole.
    expect(screen.queryByRole('button', { name: 'recite' })).toBeNull();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'recite']) fireEvent.click(action(name));
    expect(await screen.findByText(/from memory, with nothing to look at/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'recite' }), { target: { value: 'hope' } });
    fireEvent.click(action('done'));

    fireEvent.click(action('not yet'));
    expect(screen.getByRole('button', { name: 'marks only' })).toBeTruthy();

    // While fading, the next stanza is only traces.
    expect(looks(5).every((run) => run.endsWith(':trace'))).toBe(true);
    for (const name of ['marks only', 'fade the marks', 'recite', 'done', 'all of it']) fireEvent.click(action(name));
    expect(screen.getByRole('button', { name: 'stanza 2' }).getAttribute('aria-pressed')).toBe('true');
    // The page turns back to reading, so it says once what happened and what comes now.
    expect(await screen.findByText(/That stanza is taking root/)).toBeTruthy();
    // Each numeral in the tone of how its stanza stands: the first taking root, the second not begun.
    expect(action('stanza 1').className).toContain('takingRoot');
    expect(action('stanza 2').className).toContain('new');

    // The stanza numbers lead back too: one just learned opens straight on its recital, where the rest is not shown.
    fireEvent.click(action('stanza 1'));
    expect(inHand()).toEqual(['1', '2', '3', '4']);
    expect(looks(5).every((run) => run.endsWith(':gone'))).toBe(true);
    // From the practice pages, a numeral leads back to the whole poem.
    fireEvent.click(action('back'));
    expect(looks(5).every((run) => run.endsWith(':trace'))).toBe(true);
    fireEvent.click(action('stanza 1'));
    expect(looks(5)[0]).toMatch(/:ink$/);
    fireEvent.click(action('stanza 2'));
    fireEvent.click(action('mark what you hear'));
    expect(stanza(1).className).toContain('in-focus');
    for (const name of ['fade the words', 'marks only', 'fade the marks']) fireEvent.click(action(name));

    // The recital of the second stanza takes in the first, from the top, and says so once.
    fireEvent.click(action('recite'));
    expect(inHand()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(['stanza 1', 'stanza 2'].map((name) => action(name).getAttribute('aria-pressed'))).toEqual(['true', 'true']);
    expect(await screen.findByText(/all you have learned so far/)).toBeTruthy();
    // Before it begins, the reader may start it later.
    fireEvent.click(action('stanza 2'));
    expect(inHand()).toEqual(['5', '6', '7', '8']);
    // And the line before it stands faint, the way one comes to it.
    expect(looks(4)).toEqual(['Andneverstops-atall-:ink']);
    fireEvent.click(action('done'));
    fireEvent.click(action('most of it'));
    // Only most of it: the stanza's numeral turns to pencil, and the third stanza comes next.
    expect(action('stanza 2').className).toContain('fading');
    expect(action('stanza 3').getAttribute('aria-pressed')).toBe('true');
    await waitFor(async () => {
      const units = [...(await store.schedule.cards(poem.id)).keys()];
      expect(units.filter((u) => u.startsWith('stanza'))).toEqual(['stanza:0', 'stanza:1']);
    });

    // Once some of it is learned, the whole poem can be recited from the first page, starting at any stanza.
    fireEvent.click(action('recite'));
    expect(inHand()).toHaveLength(12);
    fireEvent.click(action('stanza 3'));
    expect(inHand()).toEqual(['9', '10', '11', '12']);
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
    expect(inHand()).toEqual(['5', '6', '7', '8']);
    // It opens on the marks alone, so the way on is to fade them.
    expect(action('fade the marks')).toBeTruthy();
  });

  it('keeps the latest recital only when the reader asks, and offers to play it back', async () => {
    const { store, poem } = await storeWithPoem();
    const { ear, say } = fakeEar();
    let takes = 0;
    const recorder: Recorder = {
      available: true,
      start: async () => {
        takes += 1;
        return { stop: async () => ({ data: new Uint8Array([takes]), type: 'audio/webm' }) };
      },
    };
    URL.createObjectURL = vi.fn(() => 'blob:recital');
    URL.revokeObjectURL = vi.fn();
    const recite = async () => {
      for (const name of ['fade the words', 'marks only', 'fade the marks', 'recite']) fireEvent.click(action(name));
      fireEvent.click(action('say it'));
      say('hope is the thing with feathers');
      // A pause keeps the recording going.
      fireEvent.click(action('pause'));
      fireEvent.click(action('go on'));
      await act(async () => fireEvent.click(action('done')));
    };
    show(store, poem, () => {}, ear, recorder);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));

    // Off by default: nothing is recorded.
    await recite();
    expect(takes).toBe(0);
    expect(screen.queryByRole('button', { name: 'play it back' })).toBeNull();

    cleanup();
    await store.settings.setKeepRecitals(true);
    show(store, poem, () => {}, ear, recorder);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await recite();
    expect(takes).toBe(1);
    expect(await screen.findByRole('button', { name: 'play it back' })).toBeTruthy();
    expect(Array.from((await store.recordings.get(poem.id))!.data)).toEqual([1]);
  });

  it('listens to the recital by default, pauses on a tap, takes a line again, and lets the reader type instead', async () => {
    const { store, poem } = await storeWithPoem();
    const { ear, say, refuse } = fakeEar();
    const listen = vi.spyOn(ear, 'listen');
    show(store, poem, () => {}, ear);
    await ready();
    fireEvent.click(action('mark what you hear'));
    await screen.findByRole('dialog', { name: 'beats' });
    fireEvent.click(action('put it away'));
    for (const name of ['fade the words', 'marks only', 'fade the marks', 'recite']) fireEvent.click(action(name));
    expect(await screen.findByText(/aloud, from memory, with nothing to look at/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();

    fireEvent.click(action('say it'));
    // The phone is told the words to listen for.
    expect(listen.mock.calls[0]![3]).toContain('perches');
    // A spoken word counts as soon as it is heard, and nothing is written out at the foot.
    say('hope is the thing with feathers that perches');
    expect(looks(2)).toEqual(['Thatperches:ink', 'inthesoul-:gone']);
    expect(screen.queryByText('hope is the thing with feathers that perches')).toBeNull();
    // A word gone past shows in pencil at once.
    say('hope is the thing with feathers that perches in soul');
    expect(looks(2)).toEqual(['Thatperchesin:ink', 'the:peek', 'soul-:ink']);

    // A tap on the page pauses; a tap on a line then takes it again from there.
    fireEvent.click(glyph(3, 4));
    expect(action('go on')).toBeTruthy();
    expect(await screen.findByText(/Tap a line to take it again/)).toBeTruthy();
    fireEvent.click(glyph(2, 4));
    expect(looks(2)).toEqual(['Thatperchesinthesoul-:gone']);
    expect(looks(1)).toEqual(['“Hope”isthethingwithfeathers-:ink']);
    expect(action('pause')).toBeTruthy();
    say('that perches');

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
    expect(looks(2)).toEqual(['Thatperches:ink', 'inthesoul-:peek']);
  });
});
