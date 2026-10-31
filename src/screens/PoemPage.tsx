import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { fill, type MessageKey } from '../i18n';
import { useI18n } from '../i18n/context';
import type { LessonKey } from '../i18n/lessons';
import { alignment, gonePast, keptBefore, normalize, placed, saidInstead, typedPieces } from '../learn/recall';
import {
  alongGrade,
  lineGrade,
  lineUnit,
  review,
  stanzaGrade,
  stanzaState,
  stanzaUnit,
  type Card,
  type Unit,
  type Verdict,
} from '../learn/schedule';
import { Rating, type Grade } from 'ts-fsrs';
import { chainFrom, firstStart, leadIn, linesOf, newStart, nextStart, reviewStart, stanzasOf, type Start, type Step } from '../learn/session';
import { canPeek, nextStage, previousStage, showsMarks, STAGES, type Stage } from '../learn/stages';
import { roman } from '../page/fit';
import { MarkedLine } from '../page/MarkedLine';
import { letterAbove, letterAlong, letterNear, type LineBoxes } from '../page/reach';
import { READING_LINE, stanzaAt } from '../page/reading';
import { Sheet } from '../page/Sheet';
import { useSwipeBack } from '../page/swipe';
import { Verse } from '../page/Verse';
import { useSyllabifier } from '../page/useSyllabifier';
import { isLetter, layoutLine, pauseAfter, strokeRange, syllableAt, tokenAt, type Stroke } from '../pencil/layout';
import {
  addEcho,
  echoAt,
  echoStyle,
  echoWords,
  emptyMarks,
  eraseEcho,
  familiesInUse,
  freshFamily,
  markedStanzaNear,
  markKey,
  recut,
  rhymeLetters,
  settle,
  toggleBeat,
  togglePause,
  type EchoFamily,
  type PoemMarks,
} from '../pencil/marks';
import { lastWord, tokenize, type Token } from '../pencil/tokens';
import { parsePoem, type Line } from '../poem/parse';
import { deviceEar, deviceRecorder } from '../recite/device';
import { joinHeard, type Ear, type Listening } from '../recite/ear';
import type { Recorder, Taking } from '../recite/recorder';
import { useStore } from '../store/context';
import type { ReciteBy } from '../store/settings';
import type { Poem } from '../store/poems';
import { LessonSheet } from './LessonSheet';
import { PencilBar, type Tool } from './PencilBar';
import { ReciteBox } from './ReciteBox';
import { RecutSheet } from './RecutSheet';

const LONG_LINES = 'long-lines';

/** The action that leads on to each stage. */
const STAGE_ACTION: Record<Stage, MessageKey> = {
  read: 'back',
  mark: 'stageMark',
  fadeWords: 'stageFadeWords',
  marksOnly: 'stageMarksOnly',
  fadeMarks: 'stageFadeMarks',
  blank: 'stageBlank',
};

/** The margin note each stage gets, once ever, with the key that remembers it was seen. */
const STAGE_NOTE: Record<Stage, [string, MessageKey]> = {
  read: ['note:read', 'noteRead'],
  mark: ['note:pencil', 'pencilNote'],
  fadeWords: ['note:fade-words', 'noteFadeWords'],
  marksOnly: ['note:marks-only', 'noteMarksOnly'],
  fadeMarks: ['note:fade-marks', 'noteFadeMarks'],
  blank: ['note:recite', 'noteBlank'],
};
const PEEK_NOTE: [string, MessageKey] = ['note:peek', 'notePeek'];
const MISSED_NOTE: [string, MessageKey] = ['note:missed', 'noteMissed'];
const PAUSED_NOTE: [string, MessageKey] = ['note:paused', 'notePaused'];
const CHAIN_NOTE: [string, MessageKey] = ['note:chain', 'noteChain'];
/** Shown once, without words: the next fresh underline, when one pen first spans two lines. */
const FAMILY_HINT = 'hint:echo-family';
const BECKON_MS = 3000;
const RETURN_NOTE: [string, MessageKey] = ['note:return', 'noteReturn'];
const NEXT_STANZA_NOTE: [string, MessageKey] = ['note:next-stanza', 'noteNextStanza'];
const LONG_PRESS_MS = 550;
// How far below the top, and above the foot, a stanza scrolled into view comes to rest.
const SCROLL_FOOT = 24;
const PRESS_SLOP_PX = 10;

/** A finger drawn along faded words, bringing them back or letting them go, as it found the first. */
interface Sweep {
  x: number;
  y: number;
  /** Whether the stroke brings words back or lets them go: set by the first word it touches. */
  show?: boolean;
  first?: string;
  moved: boolean;
}

/** Which step a page belongs to, so the furthest page reached is kept per step. */
const stepKey = (step: Step) => (step.kind === 'whole' ? 'whole' : `stanza:${step.stanza}`);

/** A stroke being drawn under letters: from the letter where the finger went down to the one under it now. */
interface Drawing {
  line: number;
  from: number;
  to: number;
  /** Where the finger went down, and whether it has since moved far enough to draw rather than tap. */
  x: number;
  y: number;
  moved: boolean;
}

type Word = Extract<Token, { kind: 'word' }>;

/** The line and letter under a point on the page, if any. */
function hit(target: EventTarget | Element | null): { line: number; at: number } | undefined {
  if (!(target instanceof Element)) return undefined;
  const glyph = target.closest('[data-at]');
  const line = target.closest('[data-line]');
  if (!glyph || !line) return undefined;
  return { line: Number(line.getAttribute('data-line')), at: Number(glyph.getAttribute('data-at')) };
}

/** The letters of the lines in hand, where they are on the screen. */
function lettersOnScreen(verse: Element | null, inHand: ReadonlySet<number>): LineBoxes[] {
  if (!verse) return [];
  return Array.from(verse.querySelectorAll('[data-line]'))
    .filter((el) => inHand.has(Number(el.getAttribute('data-line'))))
    .map((el) => ({
      line: Number(el.getAttribute('data-line')),
      letters: Array.from(el.querySelectorAll('.syl [data-at], .word [data-at]')).map((g) => {
        const { left, right, top, bottom } = g.getBoundingClientRect();
        return { at: Number(g.getAttribute('data-at')), left, right, top, bottom };
      }),
    }));
}

/** A mark's reach around the letters: about a letter's height above or below the line, and half that either side. */
function letterHeight(lines: readonly LineBoxes[]) {
  const first = lines.find((l) => l.letters.length > 0)?.letters[0];
  return first ? first.bottom - first.top : 0;
}

/** For a beats tap that missed the letters: the letter of a line in hand nearest the finger, if it fell near one. */
function nearHit(verse: Element | null, inHand: ReadonlySet<number>, x: number, y: number) {
  const lines = lettersOnScreen(verse, inHand);
  const height = letterHeight(lines);
  return letterNear(lines, x, y, { above: height, beside: height / 2 });
}

/** For an echo begun where its underline goes, below the letters: the letter above the finger. */
function underHit(verse: Element | null, inHand: ReadonlySet<number>, x: number, y: number) {
  const lines = lettersOnScreen(verse, inHand);
  const height = letterHeight(lines);
  return letterAbove(lines, x, y, { below: height, beside: height / 2 });
}

export function PoemPage({
  poem,
  onBack,
  onCorrect,
  ear = deviceEar,
  recorder = deviceRecorder,
}: {
  poem: Poem;
  onBack: () => void;
  /** Opens the poem's text, title and poet again to set right a mistake. */
  onCorrect?: () => void;
  ear?: Ear;
  recorder?: Recorder;
}) {
  const { m, locale } = useI18n();
  const store = useStore();
  const { seen } = store;
  const parsed = useMemo(() => parsePoem(poem.text), [poem.text]);
  const lines = useMemo(() => parsed.stanzas.flatMap((s) => s.lines), [parsed]);
  const stanzaLines = useMemo(() => parsed.stanzas.map((s) => s.lines.map((l) => l.number)), [parsed]);
  const syllabifier = useSyllabifier(poem.language);

  const [explainLongLines, setExplainLongLines] = useState(false);
  const [marks, setMarks] = useState<PoemMarks | null>(null);
  const [cards, setCards] = useState<ReadonlyMap<Unit, Card> | null>(null);
  /** The reader's last verdict on each stanza, which colours its numeral as much as the schedule does. */
  const [lastGrades, setLastGrades] = useState<ReadonlyMap<Unit, Grade>>(new Map());
  /** Nothing shows until the session knows where to begin, so a review never flashes the words. */
  const [started, setStarted] = useState(false);
  /** Parts recited well enough in this session not to come back in it. */
  const practised = useRef(new Set<number>());
  /** While the pencil moves on through the poem, the part that the fading comes back to. */
  const [step, setStep] = useState<Step>({ kind: 'stanza', stanza: 0 });
  const [stage, setStage] = useState<Stage>('read');
  // The furthest page reached with the step in hand, so that going back never means going all the way through again.
  const [furthest, setFurthest] = useState<{ step: string; stage: Stage } | null>(null);
  const stageNow = useRef<Stage>('read');
  /** On the practice pages, the words brought back in pencil, as "line:offset" of the word. */
  const [peeked, setPeeked] = useState<ReadonlySet<string>>(new Set());
  const sweep = useRef<Sweep | null>(null);
  const swept = useRef(false);
  /**
   * At the recital: what the reader said or typed, whether they are done, the
   * words they say they did have, and the word in pencil they asked about.
   */
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [granted, setGranted] = useState<ReadonlySet<string>>(new Set());
  const [asked, setAsked] = useState<string | null>(null);
  /** Speaking is the default wherever the device can listen; typing always works. */
  const [reciteBy, setReciteBy] = useState<ReciteBy>(ear.available ? 'speaking' : 'typing');
  const [hearing, setHearing] = useState(false);
  const listening = useRef<Listening | null>(null);
  /** Only when the reader chose to keep their latest recital: the recording under way, and the one just kept. */
  const [keepRecitals, setKeepRecitals] = useState(false);
  const taking = useRef<Promise<Taking | undefined> | null>(null);
  const [recital, setRecital] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('beats');
  const [family, setFamily] = useState<EchoFamily>(1);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [lesson, setLesson] = useState<LessonKey | null>(null);
  /** The lesson opened by itself, the first time its tool was picked, rather than from *about …*. */
  const [lessonFirst, setLessonFirst] = useState(false);
  /** Something at the foot that draws the eye once: a fresh underline, or *about …* after a first lesson. */
  const [beckon, setBeckon] = useState<EchoFamily | 'about' | null>(null);
  useEffect(() => {
    if (!beckon) return;
    const timer = window.setTimeout(() => setBeckon(null), BECKON_MS);
    return () => window.clearTimeout(timer);
  }, [beckon]);
  const [recutting, setRecutting] = useState<{ line: number; start: number } | null>(null);
  const [note, setNote] = useState<MessageKey | null>(null);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const pressed = useRef(false);

  const tokens = useMemo(() => {
    const byLine = new Map<number, Token[]>();
    if (!syllabifier || !marks) return byLine;
    for (const line of lines) byLine.set(line.number, tokenize(line.text, syllabifier, marks.splits[line.number]));
    return byLine;
    // Only a re-cut changes how words split, so the rest of the marks can change freely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, syllabifier, marks?.splits]);

  const letters = useMemo(() => {
    if (!marks) return new Map<number, string>();
    const ends = lines.flatMap((line) => {
      // A rhyme sounds in the last syllable, so an echo earlier in the word doesn't close the line.
      const word = lastWord(tokens.get(line.number) ?? []);
      const start = word?.syllables[word.syllables.length - 1]?.start ?? word?.start;
      return word && start !== undefined ? [{ line: line.number, start, end: word.start + word.text.length }] : [];
    });
    return rhymeLetters(marks, ends);
  }, [marks, lines, tokens]);

  // The first poem with lines too long for the page explains its turnovers
  // and suggests turning the phone sideways. Shown once, ever.
  const onTurnovers = useCallback(
    (any: boolean) => {
      if (!any) return;
      void seen.has(LONG_LINES).then(async (already) => {
        if (already) return;
        await seen.mark(LONG_LINES);
        setExplainLongLines(true);
      });
    },
    [seen],
  );

  // Every change is saved as soon as it is made. Changes are functions of the
  // marks before them, so two in one tap (a settle and a beat) both count.
  const changed = useRef(false);
  const update = (change: (marks: PoemMarks) => PoemMarks) => {
    changed.current = true;
    // The note on how to mark has done its work once the first mark is down.
    setNote((shown) => (shown === 'pencilNote' ? null : shown));
    setMarks((marks) => marks && change(marks));
  };
  useEffect(() => {
    if (marks && changed.current) void store.marks.save(poem.id, marks);
  }, [store, poem.id, marks]);

  /** Shows something once, ever: a lesson the first time its tool is picked, or a margin note. */
  const once = useCallback(
    (key: string, show: () => void) =>
      void seen.has(key).then(async (already) => {
        if (already) return;
        await seen.mark(key);
        show();
      }),
    [seen],
  );

  // The line being marked settles when the reader moves on from it.
  const settleActive = () => {
    if (activeLine !== null) update((marks) => settle(marks, activeLine));
    setActiveLine(null);
  };

  const pick = (next: Tool) => {
    settleActive();
    setTool(next);
    once(`lesson:${next}`, () => {
      setLesson(next);
      setLessonFirst(true);
    });
  };

  const pencil = stage === 'mark';
  // Reading and marking, the poem around the stanza in hand is there in faint words; from fading on, only in traces.
  const wholePoem = stage === 'read' || pencil;

  /** Ends a recording. Only a finished recital is kept; one broken off is let go. */
  const endTake = (keep: boolean) => {
    const take = taking.current;
    taking.current = null;
    if (!take) return;
    void take
      .then((t) => t?.stop())
      .then(async (sound) => {
        if (!sound || !keep) return;
        await store.recordings.keep(poem.id, sound.data, sound.type);
        setRecital(URL.createObjectURL(new Blob([sound.data as BlobPart], { type: sound.type })));
      });
  };

  /** A pause keeps the recording going; it ends when the reader is done, or leaves. */
  const pause = () => {
    listening.current?.stop();
    listening.current = null;
    setHearing(false);
  };
  const stopListening = (keep = false) => {
    pause();
    endTake(keep);
  };
  useEffect(
    () => () => {
      listening.current?.stop();
      // A recital broken off by leaving the poem is let go.
      void taking.current?.then((t) => t?.stop());
    },
    [],
  );
  useEffect(() => () => void (recital && URL.revokeObjectURL(recital)), [recital]);

  // Listening goes on until the reader pauses or is done; going on carries on from what was heard.
  /** `expect`: the words of the lines being recited. Told what to listen for, the phone hears a rare word as itself. */
  const listen = (before: string, expect: readonly string[]) => {
    setHearing(true);
    if (keepRecitals && recorder.available && !taking.current) taking.current = recorder.start();
    listening.current = ear.listen(
      poem.language,
      (heard) => setTyped(joinHeard(before, heard)),
      (problem) => {
        listening.current = null;
        setHearing(false);
        if (problem) {
          endTake(false);
          setReciteBy('typing');
          setNote('noteNoEar');
        }
      },
      expect,
    );
  };

  const switchWay = (by: ReciteBy) => {
    stopListening();
    setReciteBy(by);
    void store.settings.setReciteBy(by);
  };

  const go = (next: Stage, quiet = false, forStep = step) => {
    stageNow.current = next;
    stopListening();
    settleActive();
    setDrawing(null);
    setNote(null);
    setStage(next);
    const along = stepKey(forStep);
    setFurthest((was) => (was?.step === along && STAGES.indexOf(was.stage) >= STAGES.indexOf(next) ? was : { step: along, stage: next }));
    setTyped('');
    setDone(false);
    setRecital(null);
    setGranted(new Set());
    setAsked(null);
    if (next === 'mark') pick('beats');
    if (quiet) return;
    const [key, note] = STAGE_NOTE[next];
    const text = next === 'blank' && reciteBy === 'typing' ? 'noteBlankTyping' : note;
    // A recital that takes in more than one part says so, once, after the first recital has said what it is.
    const chain = next === 'blank' && stanzasOf(forStep, 'blank', stanzaLines.length).length > 1;
    // A note that comes too late, once the reader has moved on, is kept for the next time.
    void seen.has(key).then((already) => {
      if (stageNow.current !== next) return;
      if (!already) once(key, () => setNote(text));
      else if (chain) once(CHAIN_NOTE[0], () => setNote(CHAIN_NOTE[1]));
    });
  };

  /** A new part, its recital taking in the parts learned before it. */
  const freshStep = (stanza: number): Step => ({ kind: 'stanza', stanza, from: chainFrom(stanza, cards ?? new Map()) });

  /** The pencil moves to another stanza, so the whole poem can be marked before any of it fades. */
  const markStanza = (stanza: number) => {
    settleActive();
    setDrawing(null);
    setNote(null);
    setStep(freshStep(stanza));
  };

  /** On through the method. From the pencil, the words fade on the stanza in hand, or the nearest one marked. */
  const goOn = (next: Stage) => {
    if (pencil && next === 'fadeWords' && marks && step.kind === 'stanza') {
      const to = markedStanzaNear(step.stanza, stanzaLines, marks);
      if (to !== step.stanza) {
        const moved = freshStep(to);
        setStep(moved);
        go(next, false, moved);
        return;
      }
    }
    go(next);
  };

  const inView = useMemo(() => new Set(linesOf(step, stage, parsed)), [step, stage, parsed]);
  const leading = leadIn(step, stage, parsed);

  // When the reader, or the pencil, moves to another stanza, the page scrolls just enough to bring it
  // into view between the top and the foot, and not at all if it is already there or came there by scrolling.
  const verseRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  // The running head stays at the top of the screen, so the page's working area starts below it.
  const pageTop = () => (topRef.current?.getBoundingClientRect().bottom ?? 0) + SCROLL_FOOT;
  const inHand = stanzasOf(step, stage, stanzaLines.length)[0] ?? 0;
  const lastInHand = useRef(inHand);
  const scrolledTo = useRef(false);
  const bringIntoView = useEffectEvent(() => {
    const box = verseRef.current?.querySelector(`[data-stanza="${inHand}"]`)?.getBoundingClientRect();
    if (!box) return;
    const top = pageTop();
    const bottom = (footRef.current?.getBoundingClientRect().top ?? window.innerHeight) - SCROLL_FOOT;
    const by = box.top < top ? box.top - top : box.bottom > bottom ? Math.min(box.bottom - bottom, box.top - top) : 0;
    if (by === 0) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy?.({ top: by, behavior: still ? 'auto' : 'smooth' });
  });
  useEffect(() => {
    const from = lastInHand.current;
    lastInHand.current = inHand;
    const followed = scrolledTo.current;
    scrolledTo.current = false;
    if (from !== inHand && !followed) bringIntoView();
  }, [inHand]);
  // Taking up the pencil starts from the stanza in hand, wherever the page was.
  useEffect(() => {
    if (pencil) bringIntoView();
  }, [pencil]);

  // While marking, the stanza in hand follows the scroll: the one across the reading line turns to ink.
  const follow = useEffectEvent(() => {
    if (drawing || step.kind !== 'stanza') return;
    const stanzas = Array.from(verseRef.current?.querySelectorAll('[data-stanza]') ?? []);
    const foot = footRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const at = stanzaAt(
      stanzas.map((el) => el.getBoundingClientRect()),
      pageTop() + (foot - pageTop()) * READING_LINE,
    );
    const index = at === undefined ? undefined : Number(stanzas[at]!.getAttribute('data-stanza'));
    if (index === undefined || index === step.stanza) return;
    scrolledTo.current = true;
    markStanza(index);
  });
  useEffect(() => {
    if (!pencil) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(follow);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pencil]);

  // The words of the lines in view, in order, to line up with what the reader says or types.
  const words = useMemo(
    () =>
      lines
        .filter((line) => inView.has(line.number))
        .flatMap((line) =>
          (tokens.get(line.number) ?? []).flatMap((t) =>
            t.kind === 'word' ? [{ key: markKey(line.number, t.start), line: line.number, word: normalize(t.text), text: t.text }] : [],
          ),
        ),
    [lines, inView, tokens],
  );
  /**
   * The recital so far: what was said, lined up with the poem. A spoken word
   * counts as soon as it is heard; a typed one once the reader moves past it.
   * Words gone past without being said show in pencil at once, so the page
   * never seems stuck.
   */
  const heard = useMemo(() => {
    const said = stage === 'blank' ? typedPieces(typed, done || reciteBy === 'speaking') : [];
    const pairs = placed(
      alignment(
        words.map((w) => w.word),
        said.map(normalize),
        poem.language,
      ),
      words.map((w) => w.line),
    );
    const recalledKeys = new Set([...granted, ...pairs.map(([i]) => words[i]!.key)]);
    const passed = new Set([...gonePast(pairs, said.length, words.length)].map((i) => words[i]!.key).filter((key) => !recalledKeys.has(key)));
    // The word the reader is due to say next.
    const far = (pairs.at(-1)?.[0] ?? -1) + 1;
    return { said, pairs, recalledKeys, passed, far };
  }, [stage, words, typed, done, reciteBy, granted, poem.language]);
  const { recalledKeys } = heard;
  const paused = stage === 'blank' && reciteBy === 'speaking' && !hearing && !done && typed.trim() !== '';

  // A new stanza starts from reading it, a review from the marks, a seam or a chain from reciting.
  const open = ({ step: next, stage: first }: Start) => {
    setStep(next);
    setPeeked(new Set());
    const review = next.kind === 'stanza' && !!next.review;
    go(first, review, next);
    if (review) once(RETURN_NOTE[0], () => setNote(RETURN_NOTE[1]));
  };

  const openStanza = (i: number) =>
    open(cards?.has(stanzaUnit(i)) ? reviewStart(i, stanzaLines, cards, new Date()) : newStart(i, cards ?? new Map()));

  useEffect(() => {
    let live = true;
    // A read that fails must not leave a blank page: the poem opens with what could be read, and says why in the log.
    const orElse = <T,>(read: Promise<T>, fallback: T) =>
      read.catch((error: unknown) => {
        console.error('Mnemo could not read part of a poem', error);
        return fallback;
      });
    void Promise.all([
      orElse(store.marks.get(poem.id), emptyMarks()),
      orElse(store.schedule.cards(poem.id), new Map<Unit, Card>()),
      orElse(store.settings.reciteBy(), undefined),
      orElse(store.settings.keepRecitals(), false),
      orElse(store.schedule.lastGrades(poem.id), new Map<Unit, Grade>()),
    ]).then(([stored, scheduled, by, keep, last]) => {
      if (!live) return;
      setLastGrades(last);
      if (by === 'typing' || (by === 'speaking' && ear.available)) setReciteBy(by);
      setKeepRecitals(keep);
      setMarks(stored);
      setCards(scheduled);
      // Begin with what is due, or else the next new stanza.
      setStarted(true);
      open(firstStart(stanzaLines, scheduled, new Date()));
    });
    return () => {
      live = false;
    };
    // Only when the poem opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, poem.id]);

  /**
   * Grades what was just recited. The part in hand takes the reader's own
   * verdict, and its lines the words that came back, when the reader said or
   * typed anything at all. Every other part recited with it is graded by what
   * was missed in it (alongGrade), and so are its lines.
   */
  const grade = (verdict: Verdict, now: Date) => {
    if (!cards) return { cards, again: [] as Unit[] };
    const grades: [Unit, Grade][] = [];
    const said = heard.said.length > 0 || granted.size > 0;
    const count = (numbers: readonly number[]) => {
      const keys = words.filter((w) => numbers.some((n) => w.key.startsWith(`${n}:`))).map((w) => w.key);
      return { got: keys.filter((k) => recalledKeys.has(k)).length, of: keys.length };
    };
    const inHand = step.kind === 'stanza' ? step.stanza : undefined;
    for (const part of stanzasOf(step, 'blank', stanzaLines.length)) {
      const numbers = stanzaLines[part] ?? [];
      if (part === inHand) {
        grades.push([stanzaUnit(part), stanzaGrade(verdict)]);
        if (!said) continue;
        for (const line of numbers) {
          const { got, of } = count([line]);
          if (of > 0) grades.push([lineUnit(line), lineGrade(got, of)]);
        }
        continue;
      }
      const card = cards.get(stanzaUnit(part));
      if (!card || !said) continue;
      const { got, of } = count(numbers);
      const g = alongGrade(verdict, got, of, card, now);
      if (g !== undefined) grades.push([stanzaUnit(part), g]);
      for (const line of numbers) {
        const lineCard = cards.get(lineUnit(line));
        const words = count([line]);
        const lg = lineCard && alongGrade(verdict, words.got, words.of, lineCard, now);
        if (lg !== undefined && lg !== null) grades.push([lineUnit(line), lg]);
      }
    }
    const graded = grades.map(([unit, g]) => ({ unit, card: review(cards.get(unit), g, now), grade: g }));
    void store.schedule.save(poem.id, graded, now);
    const next = new Map(cards);
    for (const { unit, card } of graded) next.set(unit, card);
    setCards(next);
    setLastGrades(new Map([...lastGrades, ...graded.map(({ unit, grade }) => [unit, grade] as const)]));
    return { cards: next, again: graded.filter(({ grade }) => grade === Rating.Again).map(({ unit }) => unit) };
  };

  // How it went. Not yet: back to the fading of the part in hand. Otherwise on to what comes next, or back to the contents.
  const rate = (verdict: Verdict) => {
    const now = new Date();
    const { cards: next, again } = grade(verdict, now);
    if (verdict === 'notYet' && step.kind === 'stanza') {
      setPeeked(new Set());
      go('fadeWords');
      return;
    }
    for (const part of stanzasOf(step, 'blank', stanzaLines.length)) {
      if (!again.includes(stanzaUnit(part))) practised.current.add(part);
    }
    const start = next && nextStart(stanzaLines, next, now, practised.current);
    if (!start) return onBack();
    open(start);
    // The page turns back to reading, so say once what just happened and what comes now.
    if (start.step.kind === 'stanza' && !start.step.review) once(NEXT_STANZA_NOTE[0], () => setNote(NEXT_STANZA_NOTE[1]));
  };

  const finish = () => {
    stopListening(true);
    setDone(true);
    once(MISSED_NOTE[0], () => setNote(MISSED_NOTE[1]));
  };

  const pauseRecital = () => {
    pause();
    once(PAUSED_NOTE[0], () => setNote(PAUSED_NOTE[1]));
  };

  /** Paused, a tap on a line already reached takes the recital again from there: what was said from it on is let go. */
  const takeAgainFrom = (line: number) => {
    const first = words.findIndex((w) => w.key.startsWith(`${line}:`));
    if (first < 0 || first > heard.far) return;
    const kept = heard.said.slice(0, keptBefore(heard.pairs, heard.said.length, first)).join(' ');
    setTyped(kept);
    setNote(null);
    listen(kept, words.map((w) => w.text));
  };

  const back = () => {
    settleActive();
    onBack();
  };
  useSwipeBack(back);

  const lineText = (line: number) => lines.find((l) => l.number === line)?.text ?? '';

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  /** The word under a point, as "line:offset", on any line of the page. */
  const wordKeyAt = (target: EventTarget | Element | null) => {
    const at = hit(target);
    const word = at && tokenAt(tokens.get(at.line) ?? [], at.at);
    return at && word?.kind === 'word' ? markKey(at.line, word.start) : undefined;
  };

  const showWord = (key: string, show: boolean) =>
    setPeeked((words) => {
      if (words.has(key) === show) return words;
      const next = new Set(words);
      if (show) next.add(key);
      else next.delete(key);
      return next;
    });

  const onTap = (e: MouseEvent) => {
    if (!marks) return;
    // A tap on a faint stanza takes the pencil there. While fading, the traces stay still.
    const other = pencil ? (e.target as Element).closest('.stanza.faint') : null;
    if (other) {
      e.stopPropagation();
      markStanza(Number(other.getAttribute('data-stanza')));
      return;
    }
    if (swept.current) {
      swept.current = false;
      return;
    }
    const found = hit(e.target);
    // Only the lines in hand answer a tap; the rest of the poem is there to keep one's place.
    const at = found && inView.has(found.line) ? found : undefined;
    if (stage === 'blank' && !done) {
      // Listening, a tap anywhere pauses; paused, a tap on a line takes it again from there.
      if (hearing) pauseRecital();
      else if (paused) {
        const line = (e.target as Element).closest('[data-line]');
        const number = line ? Number(line.getAttribute('data-line')) : undefined;
        if (number !== undefined && inView.has(number)) takeAgainFrom(number);
      }
      return;
    }
    if (stage === 'blank' && done) {
      // Once done, a tap on a word in pencil asks what was heard there; one counted as said goes back to pencil.
      const key = at && wordKeyAt(e.target);
      if (key && granted.has(key)) {
        setGranted((words) => new Set([...words].filter((k) => k !== key)));
        setAsked(null);
      } else setAsked(key && !recalledKeys.has(key) ? key : null);
      return;
    }
    if (canPeek(stage)) {
      // A tap on a faded word brings it back, in pencil; a second tap fades it again. The other stanzas can be read too.
      const key = wordKeyAt(e.target);
      if (!key) return;
      showWord(key, !peeked.has(key));
      once(PEEK_NOTE[0], () => setNote(PEEK_NOTE[1]));
      return;
    }
    if (pencil && tool === 'beats') {
      // A beat is tapped above its syllable or near it, so a tap that misses the letters goes to the nearest one.
      const onSyllable = at && syllableAt(tokens.get(at.line) ?? [], at.at) !== undefined;
      const on = onSyllable ? at : nearHit(verseRef.current, inView, e.clientX, e.clientY);
      if (!on) return; // Empty paper: let it settle the line.
      e.stopPropagation();
      if (pressed.current) {
        pressed.current = false;
        return;
      }
      const syllable = syllableAt(tokens.get(on.line) ?? [], on.at);
      if (syllable === undefined) return;
      const leaving = activeLine !== null && activeLine !== on.line ? activeLine : null;
      update((marks) => toggleBeat(leaving === null ? marks : settle(marks, leaving), on.line, syllable));
      setActiveLine(on.line);
      return;
    }
    if (!pencil || !at) return; // Empty paper: let it settle the line.
    e.stopPropagation();
    if (pressed.current) {
      pressed.current = false;
      return;
    }
    const lineTokens = tokens.get(at.line) ?? [];
    if (tool === 'pauses') {
      const slot = pauseAfter(lineTokens, at.at);
      if (slot !== undefined) update((marks) => togglePause(marks, at.line, slot));
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    pressed.current = false;
    if (canPeek(stage)) {
      // On the practice pages, a finger drawn along a line brings its words back, or, starting on one already back, lets them go.
      // A stroke that starts beside the words takes its cue from the first word it reaches.
      const first = wordKeyAt(e.target);
      sweep.current = { x: e.clientX, y: e.clientY, show: first ? !peeked.has(first) : undefined, first, moved: false };
      return;
    }
    if (!pencil || !marks) return;
    const direct = hit(e.target);
    // An underline goes below its letters, so a stroke may start there rather than on the letters.
    const at =
      tool === 'echoes' && !(direct && isLetter(lineText(direct.line)[direct.at] ?? ''))
        ? underHit(verseRef.current, inView, e.clientX, e.clientY)
        : direct;
    if (!at || !inView.has(at.line)) return;
    if (tool === 'echoes') {
      if (!isLetter(lineText(at.line)[at.at] ?? '')) return;
      e.preventDefault();
      // Keep the stroke even if the finger or mouse strays off the poem.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDrawing({ line: at.line, from: at.at, to: at.at, x: e.clientX, y: e.clientY, moved: false });
    } else if (tool === 'beats') {
      const word = tokenAt(tokens.get(at.line) ?? [], at.at);
      if (word?.kind !== 'word') return;
      cancelPress();
      // A long press on a word opens it for re-cutting.
      const timer = window.setTimeout(() => {
        press.current = null;
        pressed.current = true;
        setRecutting({ line: at.line, start: word.start });
      }, LONG_PRESS_MS);
      press.current = { x: e.clientX, y: e.clientY, timer };
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const sweeping = sweep.current;
    if (sweeping) {
      if (!sweeping.moved && Math.hypot(e.clientX - sweeping.x, e.clientY - sweeping.y) <= PRESS_SLOP_PX) return;
      if (!sweeping.moved && sweeping.first && sweeping.show !== undefined) showWord(sweeping.first, sweeping.show);
      sweeping.moved = true;
      // A touch stays with the element it started on, so look for the word under the finger now.
      const key = wordKeyAt(document.elementFromPoint?.(e.clientX, e.clientY) ?? null);
      if (!key) return;
      sweeping.show ??= !peeked.has(key);
      showWord(key, sweeping.show);
      return;
    }
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > PRESS_SLOP_PX) cancelPress();
    if (!drawing) return;
    // A thumb rolls a little as it taps: until it really moves, it stays a tap on the letter it came down on.
    if (!drawing.moved && Math.hypot(e.clientX - drawing.x, e.clientY - drawing.y) <= PRESS_SLOP_PX) return;
    // A touch stays with the element it started on, so find the letter nearest the finger now. The stroke keeps
    // to its line, so a finger drawing below the letters, where the underline goes, still draws.
    const line = lettersOnScreen(verseRef.current, new Set([drawing.line]))[0];
    const at = line && letterAlong(line, e.clientX, e.clientY);
    if (at !== undefined && (at !== drawing.to || !drawing.moved)) setDrawing({ ...drawing, to: at, moved: true });
  };

  const onPointerUp = () => {
    cancelPress();
    if (sweep.current) {
      // A stroke along the words is not also a tap.
      swept.current = sweep.current.moved;
      sweep.current = null;
      if (swept.current) once(PEEK_NOTE[0], () => setNote(PEEK_NOTE[1]));
      return;
    }
    if (!drawing) return;
    const { line, from, to } = drawing;
    setDrawing(null);
    if (from === to) {
      // A tap on an underline rubs out the whole echo; a tap on a bare letter underlines it.
      update((marks) => {
        const echo = echoAt(marks, line, from);
        return echo ? eraseEcho(marks, echo) : addEcho(marks, { family, line, start: from, end: from + 1 });
      });
      return;
    }
    const range = strokeRange(lineText(line), from, to);
    if (!range) return;
    update((marks) => addEcho(marks, { family, line, ...range }));
    // Once a family echoes across two lines, point to a fresh underline for another sound: the pen stays in this one.
    const lines = new Set(marks?.echoes.filter((e) => e.family === family).map((e) => e.line));
    const fresh = marks && freshFamily({ ...marks, echoes: [...marks.echoes, { family, line, ...range }] });
    if (fresh && (lines.size >= 2 || (lines.size === 1 && !lines.has(line)))) once(FAMILY_HINT, () => setBeckon(fresh));
  };

  const onPointerCancel = () => {
    cancelPress();
    sweep.current = null;
    setDrawing(null);
  };

  const stroke = (line: number): Stroke | undefined => {
    if (!drawing || drawing.line !== line) return undefined;
    const range = strokeRange(lineText(line), drawing.from, drawing.to);
    return range && { family, ...range };
  };

  const ready = !!marks && !!syllabifier && started;
  const hasMarks = !!marks && (marks.beats.length > 0 || marks.echoes.length > 0 || marks.pauses.length > 0);
  const activeFamily = pencil && tool === 'echoes' ? family : undefined;

  // Whatever the reader marked shows while it should; at the other stages, none of it does.
  const shown = marks && showsMarks(stage) ? marks : emptyMarks();
  const onLine = (keys: ReadonlySet<string>, line: number) =>
    new Set([...keys].filter((key) => key.startsWith(`${line}:`)).map((key) => Number(key.split(':')[1])));
  /**
   * How a line not in hand is set. Reading and marking, in faint words; on
   * the practice pages, in traces of their shapes, which a tap or a stroke
   * can bring back; at the recital, not at all, but for the line just before
   * it, in faint words, the way one comes to it.
   */
  const stageOf = (line: number): Stage => {
    if (inView.has(line) || wholePoem) return stage;
    if (stage !== 'blank') return 'fadeMarks';
    return line === leading ? 'read' : 'blank';
  };
  const renderLine = (line: Line) => (
    <MarkedLine
      pieces={layoutLine(
        tokens.get(line.number) ?? [],
        inView.has(line.number) || wholePoem ? shown : emptyMarks(),
        line.number,
        stroke(line.number),
        {
          stage: stageOf(line.number),
          peeked: onLine(peeked, line.number),
          recalled: onLine(inView.has(line.number) ? recalledKeys : new Set(), line.number),
          passed: onLine(inView.has(line.number) ? heard.passed : new Set(), line.number),
          done: done && inView.has(line.number),
        },
      )}
      // Other sounds step back only in the stanza in hand; a faint stanza stays evenly faint.
      activeFamily={inView.has(line.number) ? activeFamily : undefined}
    />
  );
  const aside = (line: Line) => {
    const letter = showsMarks(stage) ? letters.get(line.number) : undefined;
    return letter ? (
      <span className="rhyme" aria-hidden="true">
        {letter}
      </span>
    ) : null;
  };

  // The pens on the bar: every sound underlined so far, then a fresh one for the next.
  const penFamilies = marks
    ? [...new Set([...familiesInUse(marks), freshFamily(marks), family])].sort((a, b) => a - b)
    : [family];
  const wordText = (line: number, at: number) => {
    const word = tokenAt(tokens.get(line) ?? [], at);
    return word?.kind === 'word' ? word.text : undefined;
  };

  const recutWord = recutting
    ? (tokenAt(tokens.get(recutting.line) ?? [], recutting.start) as Word | undefined)
    : undefined;

  /** What the phone heard where a word in pencil should have been. */
  const heardAt = (key: string) => {
    const index = words.findIndex((w) => w.key === key);
    return index < 0 ? [] : saidInstead(heard.pairs, heard.said, index);
  };
  const grant = (key: string) => {
    setGranted((words) => new Set(words).add(key));
    setAsked(null);
  };

  /** Before a recital begins, the reader may start it at a later part, or, reciting the whole poem, at any. */
  const startAt = (i: number) => {
    if (step.kind === 'whole') setStep({ kind: 'whole', from: i });
    else if (i >= chainFrom(step.stanza, cards ?? new Map()) && i <= step.stanza) setStep({ ...step, from: i });
  };

  /** The whole poem, recited whenever the reader likes, once some of it is learned. */
  const reciteWhole = () => open({ step: { kind: 'whole', from: 0 }, stage: 'blank' });
  const anyLearned = stanzaLines.some((_, i) => cards?.has(stanzaUnit(i)));
  const reachedStage = furthest?.step === stepKey(step) ? furthest.stage : undefined;
  // Once a later page has been reached, its name stays at the foot. On the first page, *recite* goes back to the
  // recital left there, or else recites the whole poem.
  const ahead = reachedStage && stage !== 'blank' && STAGES.indexOf(reachedStage) > STAGES.indexOf(nextStage(stage) ?? stage) ? reachedStage : undefined;

  // Each stanza's numeral, in the margin beside it, is set in the tone of how it stands now.
  const now = new Date();
  const numeral = (i: number) => {
    const className = `stanza-numeral ${cards ? stanzaState(i, stanzaLines, cards, lastGrades, now) : 'new'}`;
    // While marking, a tap anywhere on a stanza moves the pencil, numeral and all.
    if (pencil) return <span className={className}>{roman(i + 1)}</span>;
    return (
      <button
        type="button"
        className={`action ${className}`}
        aria-label={`${m.stanza} ${i + 1}`}
        aria-pressed={stanzasOf(step, stage, stanzaLines.length).includes(i)}
        // On the first page it opens the stanza; on the practice pages it leads back to the whole poem; before a
        // recital begins, it says where to start.
        onClick={(e) => {
          e.stopPropagation();
          if (stage === 'read') openStanza(i);
          else if (stage !== 'blank') go('read');
          else if (hearing) pauseRecital();
          else if (!done && !typed.trim()) startAt(i);
        }}
      >
        {roman(i + 1)}
      </button>
    );
  };

  return (
    <main
      className="page poem-page"
      lang={poem.language}
      onClick={(e) => {
        if (pencil) settleActive();
        // Listening, a tap anywhere on the page pauses, but for the words at its foot.
        else if (hearing && !(e.target as Element).closest('.stage-foot, button')) pauseRecital();
      }}
    >
      <div ref={topRef} className="top running-top">
        <button type="button" className="action" onClick={back}>
          {m.contents}
        </button>
        {/* On the first page, a tap on the poet or the title opens them to correct. */}
        <span className="byline" onClick={stage === 'read' ? onCorrect : undefined}>
          {poem.poet}
        </span>
      </div>
      <h1 className="poem-title" onClick={stage === 'read' ? onCorrect : undefined}>
        {poem.title}
      </h1>
      {drawing && (
        <div className="loupe" aria-hidden="true">
          <MarkedLine
            pieces={layoutLine(tokens.get(drawing.line) ?? [], marks!, drawing.line, stroke(drawing.line))}
            activeFamily={family}
          />
        </div>
      )}
      <div
        ref={verseRef}
        className="pencil-area"
        onClick={onTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={pencil ? (e) => e.preventDefault() : undefined}
      >
        <Verse
          poem={parsed}
          onTurnovers={onTurnovers}
          className={[
            `stage-${stage}`,
            (pencil || hasMarks) && 'marked',
            pencil && `pencil tool-${tool}`,
            canPeek(stage) && 'peekable',
          ]
            .filter(Boolean)
            .join(' ')}
          renderLine={ready ? renderLine : undefined}
          aside={ready ? aside : undefined}
          // The whole poem is on the page, the lines in hand in ink and the rest faint.
          only={started ? undefined : new Set()}
          // On the first page the whole poem is in ink, to read through.
          focus={stage === 'read' ? undefined : inView}
          numeral={parsed.stanzas.length > 1 ? numeral : undefined}
        />
      </div>
      {/* While marking, the foot of the page is taken up by the verse's room to scroll, so the note sits above the bar instead. */}
      {note && !pencil && (
        <p className="note" lang={locale}>
          {m[note]}
        </p>
      )}
      <div ref={footRef} className={pencil ? 'stage-foot pencil-foot' : 'stage-foot'} lang={locale}>
        {pencil && note && <p className="note foot-note">{m[note]}</p>}
        {pencil && (
          <PencilBar
            tool={tool}
            family={family}
            families={penFamilies}
            styleOf={(f) => echoStyle(marks ?? emptyMarks(), f)}
            words={marks ? echoWords(marks, family, wordText) : []}
            wordsLang={poem.language}
            onTool={pick}
            onFamily={(f) => {
              setBeckon(null);
              setFamily(f);
            }}
            beckon={beckon ?? undefined}
            onAbout={() => {
              setLesson(tool);
              setLessonFirst(false);
            }}
          />
        )}
        {stage === 'blank' && !done && (
          <ReciteBox
            by={reciteBy}
            canSpeak={ear.available}
            text={typed}
            hearing={hearing}
            paused={paused}
            language={poem.language}
            onType={setTyped}
            onListen={() => {
              setNote(null);
              listen(
                typed,
                words.map((w) => w.text),
              );
            }}
            onPause={pauseRecital}
            onDone={finish}
            onBack={() => (step.kind === 'whole' ? go('read') : go('fadeMarks'))}
            onSwitch={switchWay}
          />
        )}
        {asked && <Heard words={heardAt(asked)} onSaid={() => grant(asked)} />}
        {done && recital && (
          <div className="stage-actions">
            <button type="button" className="action soft" onClick={() => void new Audio(recital).play()}>
              {m.playBack}
            </button>
          </div>
        )}
        <StageActions
          stage={stage}
          done={done}
          ready={ready}
          onGo={goOn}
          onRate={rate}
          onAgain={() => go('blank', true)}
          ahead={ahead}
          onRecite={stage === 'read' && anyLearned && ahead !== 'blank' ? reciteWhole : undefined}
        />
        {stage === 'read' && onCorrect && (
          <div className="poem-care">
            <button type="button" className="action quiet" onClick={onCorrect}>
              {m.correctPoem}
            </button>
          </div>
        )}
      </div>
      {lesson && (
        <LessonSheet
          lesson={lesson}
          onOpen={(key) => {
            setLesson(key);
            setLessonFirst(false);
          }}
          onClose={() => {
            // A lesson that opened by itself shows, as it goes, where it can be found again.
            if (lessonFirst) setBeckon('about');
            setLesson(null);
          }}
        />
      )}
      {recutting && recutWord && marks && (
        <RecutSheet
          word={recutWord.text}
          breaks={recutWord.syllables.slice(1).map((s) => s.start - recutWord.start)}
          language={poem.language}
          onChange={(breaks) =>
            update((marks) =>
              recut(marks, recutting.line, { start: recutWord.start, end: recutWord.start + recutWord.text.length }, breaks),
            )
          }
          onClose={() => setRecutting(null)}
        />
      )}
      {explainLongLines && (
        <div lang={locale}>
          <Sheet title={m.longLinesTitle} onClose={() => setExplainLongLines(false)}>
            <p>{m.longLines1}</p>
            <p>{m.longLines2}</p>
            <p>{m.longLines3}</p>
          </Sheet>
        </div>
      )}
    </main>
  );
}

/** Once a recital is done: what the phone heard where a word in pencil should have been, and a way to say it was right. */
function Heard({ words, onSaid }: { words: readonly string[]; onSaid: () => void }) {
  const { m } = useI18n();
  return (
    <div className="heard">
      <p className="note foot-note">{words.length > 0 ? fill(m.heardThere, { words: words.join(' ') }) : m.heardNothing}</p>
      <div className="stage-actions">
        <button type="button" className="action" onClick={onSaid}>
          {m.saidThat}
        </button>
      </div>
    </div>
  );
}

/** The words at the foot of the page that move a stanza through the method. */
function StageActions({
  stage,
  done,
  ready,
  onGo,
  onRate,
  onAgain,
  ahead,
  onRecite,
}: {
  stage: Stage;
  done: boolean;
  ready: boolean;
  onGo: (stage: Stage) => void;
  onRate: (verdict: Verdict) => void;
  /** After the recital: clear the page and try it again. */
  onAgain: () => void;
  /** A later page already reached with this step, to go straight back to. */
  ahead?: Stage;
  /** On the first page, once some of the poem is learned: recite the whole of it. */
  onRecite?: () => void;
}) {
  const { m } = useI18n();
  if (stage === 'blank' && done) {
    return (
      <>
        <p className="rate-question">{m.rateQuestion}</p>
        <div className="stage-actions">
          {/* Nothing is saved until the reader says how it went, so another try first costs nothing. */}
          <button type="button" className="action soft" onClick={onAgain}>
            {m.reciteAgain}
          </button>
          <button type="button" className="action soft" onClick={() => onRate('notYet')}>
            {m.rateNotYet}
          </button>
          <button type="button" className="action" onClick={() => onRate('most')}>
            {m.rateMost}
          </button>
          <button type="button" className="action" onClick={() => onRate('all')}>
            {m.rateAll}
          </button>
        </div>
      </>
    );
  }
  // The recital has its own words at the foot.
  if (stage === 'blank') return null;
  const back = previousStage(stage);
  const next = nextStage(stage);
  return (
    <div className="stage-actions">
      {/* While marking, *back* on the pencil's bar is the way back. */}
      {back && (
        <button type="button" className="action soft" onClick={() => onGo(back)}>
          {m.back}
        </button>
      )}
      {next && (
        // The one word that hands over the pencil is written in it.
        <button type="button" className={next === 'mark' ? 'action to-pencil' : 'action'} disabled={!ready} onClick={() => onGo(next)}>
          {m[STAGE_ACTION[next]]}
        </button>
      )}
      {ahead && (
        <button type="button" className="action" disabled={!ready} onClick={() => onGo(ahead)}>
          {m[STAGE_ACTION[ahead]]}
        </button>
      )}
      {onRecite && (
        <button type="button" className="action" disabled={!ready} onClick={onRecite}>
          {m.stageBlank}
        </button>
      )}
    </div>
  );
}
