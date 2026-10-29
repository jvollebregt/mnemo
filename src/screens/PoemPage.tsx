import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n/context';
import type { LessonKey } from '../i18n/lessons';
import { recalled, normalize, typedWords } from '../learn/recall';
import {
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
import type { Grade } from 'ts-fsrs';
import { firstStart, linesOf, nextStart, reviewStart, stanzasOf, startOf, type Start, type Step } from '../learn/session';
import { canPeek, nextStage, previousStage, showsMarks, type Stage } from '../learn/stages';
import { roman } from '../page/fit';
import { MarkedLine } from '../page/MarkedLine';
import { Sheet } from '../page/Sheet';
import { Verse } from '../page/Verse';
import { useSyllabifier } from '../page/useSyllabifier';
import { isLetter, layoutLine, pauseAfter, strokeRange, syllableAt, tokenAt, type Stroke } from '../pencil/layout';
import {
  addEcho,
  ECHO_FAMILIES,
  echoAt,
  emptyMarks,
  eraseEcho,
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
/** Shown once, without words: the next fresh underline, when one pen first spans two lines. */
const FAMILY_HINT = 'hint:echo-family';
const BECKON_MS = 3000;
const STEP_NOTE: Partial<Record<Step['kind'], [string, MessageKey]>> = {
  seam: ['note:seam', 'noteSeam'],
  chain: ['note:chain', 'noteChain'],
};
const RETURN_NOTE: [string, MessageKey] = ['note:return', 'noteReturn'];
const LONG_PRESS_MS = 550;
const PRESS_SLOP_PX = 10;

/** A stroke being drawn under letters: from the letter where the finger went down to the one under it now. */
interface Drawing {
  line: number;
  from: number;
  to: number;
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

export function PoemPage({
  poem,
  onBack,
  onRemove,
  onCorrect,
  ear = deviceEar,
  recorder = deviceRecorder,
}: {
  poem: Poem;
  onBack: () => void;
  /** Lets the poem go, with its marks and schedule, after a second tap to be sure. */
  onRemove?: () => void;
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
  const syllabifier = useSyllabifier(poem.language);

  const [explainLongLines, setExplainLongLines] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [marks, setMarks] = useState<PoemMarks | null>(null);
  const [cards, setCards] = useState<ReadonlyMap<Unit, Card> | null>(null);
  /** The reader's last verdict on each stanza, which colours its numeral as much as the schedule does. */
  const [lastGrades, setLastGrades] = useState<ReadonlyMap<Unit, Grade>>(new Map());
  /** Nothing shows until the session knows where to begin, so a review never flashes the words. */
  const [started, setStarted] = useState(false);
  /** Stanzas recited well enough in this session not to come back in it. */
  const practised = useRef(new Set<number>());
  /** While the pencil moves on through the poem, the stanza that the fading comes back to. */
  const markingFrom = useRef<Step | null>(null);
  const [step, setStep] = useState<Step>({ kind: 'stanza', stanza: 0 });
  const [stage, setStage] = useState<Stage>('read');
  /** Words showing in pencil, as "line:offset" of the word, and every word peeked at in this step, which still counts once faded again. */
  const [peeked, setPeeked] = useState<ReadonlySet<string>>(new Set());
  const [looked, setLooked] = useState<ReadonlySet<string>>(new Set());
  /** On the blank page: what the reader typed, whether they are done, and the words they say they did have. */
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [granted, setGranted] = useState<ReadonlySet<string>>(new Set());
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

  const stopListening = (keep = false) => {
    listening.current?.stop();
    listening.current = null;
    setHearing(false);
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

  // Listening goes on until the reader is done; a second start carries on from what was heard.
  const listen = () => {
    const before = typed;
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
    );
  };

  const switchWay = (by: ReciteBy) => {
    stopListening();
    setReciteBy(by);
    void store.settings.setReciteBy(by);
  };

  const go = (next: Stage, quiet = false) => {
    stopListening();
    settleActive();
    setDrawing(null);
    setNote(null);
    setStage(next);
    setTyped('');
    setDone(false);
    setRecital(null);
    setGranted(new Set());
    if (next === 'mark') pick('beats');
    if (quiet) return;
    const [key, note] = STAGE_NOTE[next];
    const text = next === 'blank' && reciteBy === 'typing' ? 'noteBlankTyping' : note;
    once(key, () => setNote(text));
  };

  /** The pencil moves to another stanza, so the whole poem can be marked before any of it fades. */
  const markStanza = (stanza: number) => {
    markingFrom.current ??= step;
    settleActive();
    setDrawing(null);
    setNote(null);
    setStep({ kind: 'stanza', stanza });
  };

  /** Leaving the pencil goes back to the stanza being learned, wherever the marking got to. */
  const goOn = (next: Stage) => {
    if (markingFrom.current) {
      setStep(markingFrom.current);
      markingFrom.current = null;
    }
    go(next);
  };

  const inView = useMemo(() => new Set(linesOf(step, parsed)), [step, parsed]);

  // While marking, the stanza the pencil moves to scrolls up into place, as a page is read on.
  const verseRef = useRef<HTMLDivElement>(null);
  const markedStanza = pencil && step.kind === 'stanza' ? step.stanza : null;
  const lastMarked = useRef<number | null>(null);
  useEffect(() => {
    const from = lastMarked.current;
    lastMarked.current = markedStanza;
    if (markedStanza === null || from === null || from === markedStanza) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    verseRef.current
      ?.querySelector(`[data-stanza="${markedStanza}"]`)
      ?.scrollIntoView?.({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [markedStanza]);

  // The words of the lines in view, in order, to line up with what the reader types.
  const words = useMemo(
    () =>
      lines
        .filter((line) => inView.has(line.number))
        .flatMap((line) =>
          (tokens.get(line.number) ?? []).flatMap((t) =>
            t.kind === 'word' ? [{ key: markKey(line.number, t.start), word: normalize(t.text) }] : [],
          ),
        ),
    [lines, inView, tokens],
  );
  const recalledKeys = useMemo(() => {
    if (stage !== 'blank') return new Set<string>();
    const found = recalled(
      words.map((w) => w.word),
      typedWords(typed, done),
    );
    return new Set([...granted, ...[...found].map((i) => words[i]!.key)]);
  }, [stage, words, typed, done, granted]);

  const stanzaLines = useMemo(() => parsed.stanzas.map((s) => s.lines.map((l) => l.number)), [parsed]);

  // A new stanza starts from reading it, a review from the marks, a seam or a chain from reciting.
  const open = ({ step: next, stage: first }: Start) => {
    markingFrom.current = null;
    setStep(next);
    setPeeked(new Set());
    setLooked(new Set());
    const review = next.kind === 'stanza' && !!next.review;
    go(first, review);
    const stepNote = review ? RETURN_NOTE : STEP_NOTE[next.kind];
    if (stepNote) once(stepNote[0], () => setNote(stepNote[1]));
  };

  const openStanza = (i: number) =>
    open(cards?.has(stanzaUnit(i)) ? reviewStart(i, stanzaLines, cards, new Date()) : startOf({ kind: 'stanza', stanza: i }));

  useEffect(() => {
    let live = true;
    void Promise.all([
      store.marks.get(poem.id),
      store.schedule.cards(poem.id),
      store.settings.reciteBy(),
      store.settings.keepRecitals(),
      store.schedule.lastGrades(poem.id),
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
   * Grades what was just recited. The stanza takes the reader's own verdict;
   * each line takes the words that came back unseen, when the reader typed or
   * said anything at all.
   */
  const grade = (verdict: Verdict, now: Date) => {
    if (!cards) return cards;
    const grades: [Unit, ReturnType<typeof lineGrade>][] = [];
    if (step.kind === 'stanza') grades.push([stanzaUnit(step.stanza), stanzaGrade(verdict, looked.size > 0)]);
    if (typedWords(typed, true).length > 0 || granted.size > 0) {
      for (const line of inView) {
        const keys = words.filter((w) => w.key.startsWith(`${line}:`)).map((w) => w.key);
        if (keys.length === 0) continue;
        const unseen = keys.filter((k) => recalledKeys.has(k) && !looked.has(k)).length;
        grades.push([lineUnit(line), lineGrade(unseen, keys.length, keys.some((k) => looked.has(k)))]);
      }
    }
    const graded = grades.map(([unit, g]) => ({ unit, card: review(cards.get(unit), g, now), grade: g }));
    void store.schedule.save(poem.id, graded, now);
    const next = new Map(cards);
    for (const { unit, card } of graded) next.set(unit, card);
    setCards(next);
    setLastGrades(new Map([...lastGrades, ...graded.map(({ unit, grade }) => [unit, grade] as const)]));
    return next;
  };

  // How it went. Not yet: back to the fading. Otherwise on to what comes next, or back to the contents.
  const rate = (verdict: Verdict) => {
    const now = new Date();
    const graded = grade(verdict, now);
    if (verdict === 'notYet') {
      setPeeked(new Set());
      setLooked(new Set());
      go('fadeWords');
      return;
    }
    if (step.kind === 'stanza') practised.current.add(step.stanza);
    const next = graded && nextStart(step, stanzaLines, graded, now, practised.current);
    if (next) open(next);
    else onBack();
  };

  const finish = () => {
    stopListening(true);
    setDone(true);
    once(MISSED_NOTE[0], () => setNote(MISSED_NOTE[1]));
  };

  const back = () => {
    settleActive();
    onBack();
  };

  const lineText = (line: number) => lines.find((l) => l.number === line)?.text ?? '';

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onTap = (e: MouseEvent) => {
    if (!marks) return;
    // A tap on a faint stanza takes the reader, or the pencil, there.
    const other = (e.target as Element).closest('.stanza.faint');
    if (other) {
      e.stopPropagation();
      const i = Number(other.getAttribute('data-stanza'));
      if (pencil) markStanza(i);
      else openStanza(i);
      return;
    }
    const at = hit(e.target);
    if (at && stage === 'blank' && done) {
      // Once done, a tap on a word in pencil says the reader did have it, unless they peeked at it.
      const word = tokenAt(tokens.get(at.line) ?? [], at.at);
      const key = word?.kind === 'word' ? markKey(at.line, word.start) : undefined;
      if (!key || looked.has(key)) return;
      setGranted((words) => {
        const next = new Set(words);
        if (!next.delete(key)) next.add(key);
        return next;
      });
      return;
    }
    if (at && canPeek(stage)) {
      // A tap on a faded word brings it back, in pencil; a second tap fades it again. Either way it was looked at.
      const word = tokenAt(tokens.get(at.line) ?? [], at.at);
      if (word?.kind !== 'word') return;
      const key = markKey(at.line, word.start);
      setPeeked((words) => {
        const next = new Set(words);
        if (!next.delete(key)) next.add(key);
        return next;
      });
      setLooked((words) => new Set(words).add(key));
      once(PEEK_NOTE[0], () => setNote(PEEK_NOTE[1]));
      return;
    }
    if (!pencil || !at || !inView.has(at.line)) return; // Empty paper: let it settle the line.
    e.stopPropagation();
    if (pressed.current) {
      pressed.current = false;
      return;
    }
    const lineTokens = tokens.get(at.line) ?? [];
    if (tool === 'beats') {
      const syllable = syllableAt(lineTokens, at.at);
      if (syllable === undefined) return;
      const leaving = activeLine !== null && activeLine !== at.line ? activeLine : null;
      update((marks) => toggleBeat(leaving === null ? marks : settle(marks, leaving), at.line, syllable));
      setActiveLine(at.line);
    } else if (tool === 'pauses') {
      const slot = pauseAfter(lineTokens, at.at);
      if (slot !== undefined) update((marks) => togglePause(marks, at.line, slot));
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    pressed.current = false;
    if (!pencil || !marks) return;
    const at = hit(e.target);
    if (!at || !inView.has(at.line)) return;
    if (tool === 'echoes') {
      if (!isLetter(lineText(at.line)[at.at] ?? '')) return;
      e.preventDefault();
      // Keep the stroke even if the finger or mouse strays off the poem.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDrawing({ line: at.line, from: at.at, to: at.at });
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
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > PRESS_SLOP_PX) cancelPress();
    if (!drawing) return;
    // A touch stays with the element it started on, so find the letter under the finger now.
    const under = document.elementFromPoint?.(e.clientX, e.clientY) ?? e.target;
    const at = hit(under);
    if (at && at.line === drawing.line && at.at !== drawing.to) setDrawing({ ...drawing, to: at.at });
  };

  const onPointerUp = () => {
    cancelPress();
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
    const fresh = ECHO_FAMILIES.find((f) => f !== family && !marks?.echoes.some((e) => e.family === f));
    if (fresh && (lines.size >= 2 || (lines.size === 1 && !lines.has(line)))) once(FAMILY_HINT, () => setBeckon(fresh));
  };

  const onPointerCancel = () => {
    cancelPress();
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
  const renderLine = (line: Line) => (
    <MarkedLine
      pieces={layoutLine(tokens.get(line.number) ?? [], shown, line.number, stroke(line.number), {
        stage,
        // Once the recital is done, every word looked at shows in pencil.
        peeked: onLine(done ? looked : peeked, line.number),
        recalled: onLine(recalledKeys, line.number),
        done,
      })}
      activeFamily={activeFamily}
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

  const recutWord = recutting
    ? (tokenAt(tokens.get(recutting.line) ?? [], recutting.start) as Word | undefined)
    : undefined;

  // Each stanza's numeral, in the margin beside it, is set in the tone of how it stands now.
  const now = new Date();
  const wholePoem = stage === 'read' || pencil;
  const numeral = (i: number) => {
    const className = `stanza-numeral ${cards ? stanzaState(i, stanzaLines, cards, lastGrades, now) : 'new'}`;
    // While marking, a tap anywhere on a stanza moves the pencil, numeral and all.
    if (pencil) return <span className={className}>{roman(i + 1)}</span>;
    return (
      <button
        type="button"
        className={`action ${className}`}
        aria-label={`${m.stanza} ${i + 1}`}
        aria-pressed={stanzasOf(step).includes(i)}
        // On the first page it opens the stanza; from fading on, it leads back to the whole poem.
        onClick={(e) => {
          e.stopPropagation();
          if (stage === 'read') openStanza(i);
          else go('read');
        }}
      >
        {roman(i + 1)}
      </button>
    );
  };

  return (
    <main className="page poem-page" lang={poem.language} onClick={pencil ? settleActive : undefined}>
      <div className="top">
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
          // Reading and marking, the whole poem is on the page, the stanza in hand in ink and the rest faint.
          // From fading on, the stanza being learned is alone.
          only={!started ? new Set() : wholePoem ? undefined : inView}
          focus={wholePoem ? inView : undefined}
          numeral={parsed.stanzas.length > 1 ? numeral : undefined}
        />
      </div>
      {note && (
        <p className="note" lang={locale}>
          {m[note]}
        </p>
      )}
      <div className={pencil ? 'stage-foot pencil-foot' : 'stage-foot'} lang={locale}>
        {pencil && (
          <PencilBar
            tool={tool}
            family={family}
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
            onPutDown={() => goOn('read')}
          />
        )}
        {stage === 'blank' && !done && (
          <ReciteBox
            by={reciteBy}
            canSpeak={ear.available}
            text={typed}
            hearing={hearing}
            language={poem.language}
            onType={setTyped}
            onListen={listen}
            onSwitch={switchWay}
          />
        )}
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
          onDone={finish}
          onRate={rate}
        />
        {stage === 'read' && (onCorrect || onRemove) && (
          <div className="poem-care">
            {onCorrect && !removing && (
              <button type="button" className="action quiet" onClick={onCorrect}>
                {m.correctPoem}
              </button>
            )}
            {onRemove && (
              <button type="button" className="action quiet" onClick={() => (removing ? onRemove() : setRemoving(true))}>
                {removing ? m.removePoemSure : m.removePoem}
              </button>
            )}
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

/** The words at the foot of the page that move a stanza through the method. */
function StageActions({
  stage,
  done,
  ready,
  onGo,
  onDone,
  onRate,
}: {
  stage: Stage;
  done: boolean;
  ready: boolean;
  onGo: (stage: Stage) => void;
  onDone: () => void;
  onRate: (verdict: Verdict) => void;
}) {
  const { m } = useI18n();
  if (stage === 'blank' && done) {
    return (
      <div className="stage-actions">
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
    );
  }
  const back = previousStage(stage);
  const next = nextStage(stage);
  return (
    <div className="stage-actions">
      {/* While marking, *put down* is the way back. */}
      {back && stage !== 'mark' && (
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
      {stage === 'blank' && (
        <button type="button" className="action" onClick={onDone}>
          {m.reciteDone}
        </button>
      )}
    </div>
  );
}
