import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { MessageKey } from '../i18n';
import { useI18n } from '../i18n/context';
import type { LessonKey } from '../i18n/lessons';
import { canPeek, nextStage, previousStage, showsMarks, type Stage } from '../learn/stages';
import { roman } from '../page/fit';
import { MarkedLine } from '../page/MarkedLine';
import { Sheet } from '../page/Sheet';
import { Verse } from '../page/Verse';
import { useSyllabifier } from '../page/useSyllabifier';
import { isLetter, layoutLine, pauseAfter, strokeRange, syllableAt, tokenAt, type Stroke } from '../pencil/layout';
import {
  addEcho,
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
import { useStore } from '../store/context';
import type { Poem } from '../store/poems';
import { LessonSheet } from './LessonSheet';
import { PencilBar, type Tool } from './PencilBar';
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
  check: 'stageCheck',
};

/** The margin note each stage gets, once ever, with the key that remembers it was seen. */
const STAGE_NOTE: Record<Stage, [string, MessageKey]> = {
  read: ['note:read', 'noteRead'],
  mark: ['note:pencil', 'pencilNote'],
  fadeWords: ['note:fade-words', 'noteFadeWords'],
  marksOnly: ['note:marks-only', 'noteMarksOnly'],
  fadeMarks: ['note:fade-marks', 'noteFadeMarks'],
  blank: ['note:blank', 'noteBlank'],
  check: ['note:check', 'noteCheck'],
};
const PEEK_NOTE: [string, MessageKey] = ['note:peek', 'notePeek'];
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

export function PoemPage({ poem, onBack }: { poem: Poem; onBack: () => void }) {
  const { m, locale } = useI18n();
  const store = useStore();
  const { seen } = store;
  const parsed = useMemo(() => parsePoem(poem.text), [poem.text]);
  const lines = useMemo(() => parsed.stanzas.flatMap((s) => s.lines), [parsed]);
  const syllabifier = useSyllabifier(poem.language);

  const [explainLongLines, setExplainLongLines] = useState(false);
  const [marks, setMarks] = useState<PoemMarks | null>(null);
  const [stanza, setStanza] = useState(0);
  const [stage, setStage] = useState<Stage>('read');
  /** Words peeked at in this stanza, as "line:offset" of the word. */
  const [peeked, setPeeked] = useState<ReadonlySet<string>>(new Set());
  const [tool, setTool] = useState<Tool>('beats');
  const [family, setFamily] = useState<EchoFamily>(1);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [lesson, setLesson] = useState<LessonKey | null>(null);
  const [recutting, setRecutting] = useState<{ line: number; start: number } | null>(null);
  const [note, setNote] = useState<MessageKey | null>(null);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const pressed = useRef(false);

  useEffect(() => {
    let live = true;
    void store.marks.get(poem.id).then((stored) => live && setMarks(stored));
    return () => {
      live = false;
    };
  }, [store, poem.id]);

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
      const word = lastWord(tokens.get(line.number) ?? []);
      return word ? [{ line: line.number, start: word.start, end: word.start + word.text.length }] : [];
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

  // The first stanza ever opened explains reading aloud.
  useEffect(() => {
    const [key, text] = STAGE_NOTE.read;
    once(key, () => setNote(text));
  }, [once]);

  // The line being marked settles when the reader moves on from it.
  const settleActive = () => {
    if (activeLine !== null) update((marks) => settle(marks, activeLine));
    setActiveLine(null);
  };

  const pick = (next: Tool) => {
    settleActive();
    setTool(next);
    once(`lesson:${next}`, () => setLesson(next));
  };

  const pencil = stage === 'mark';

  const go = (next: Stage) => {
    settleActive();
    setDrawing(null);
    setNote(null);
    setStage(next);
    if (next === 'mark') pick('beats');
    const [key, text] = STAGE_NOTE[next];
    once(key, () => setNote(text));
  };

  const openStanza = (index: number) => {
    setStanza(index);
    setPeeked(new Set());
    go('read');
  };

  // How it went. Not yet: back to the fading. Otherwise on to the next stanza, or back to the contents.
  const rate = (again: boolean) => {
    if (again) {
      setPeeked(new Set());
      go('fadeWords');
    } else if (stanza + 1 < parsed.stanzas.length) openStanza(stanza + 1);
    else onBack();
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
    const at = hit(e.target);
    if (at && canPeek(stage)) {
      // A tap on a faded word brings it back, in pencil.
      const word = tokenAt(tokens.get(at.line) ?? [], at.at);
      if (word?.kind !== 'word') return;
      setPeeked((words) => new Set(words).add(markKey(at.line, word.start)));
      once(PEEK_NOTE[0], () => setNote(PEEK_NOTE[1]));
      return;
    }
    if (!pencil || !at) return; // Empty paper: let it settle the line.
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
    if (!at) return;
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
    if (range) update((marks) => addEcho(marks, { family, line, ...range }));
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

  const ready = !!marks && !!syllabifier;
  const hasMarks = !!marks && (marks.beats.length > 0 || marks.echoes.length > 0 || marks.pauses.length > 0);
  const activeFamily = pencil && tool === 'echoes' ? family : undefined;

  // Whatever the reader marked shows while it should; at the other stages, none of it does.
  const shown = marks && showsMarks(stage) ? marks : emptyMarks();
  const peekedOn = (line: number) =>
    new Set([...peeked].filter((key) => key.startsWith(`${line}:`)).map((key) => Number(key.split(':')[1])));
  const renderLine = (line: Line) => (
    <MarkedLine
      pieces={layoutLine(tokens.get(line.number) ?? [], shown, line.number, stroke(line.number), {
        stage,
        peeked: peekedOn(line.number),
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

  return (
    <main className="page poem-page" lang={poem.language} onClick={pencil ? settleActive : undefined}>
      <div className="top">
        <button type="button" className="action" onClick={back}>
          {m.contents}
        </button>
        <span className="byline">{poem.poet}</span>
      </div>
      <h1 className="poem-title">{poem.title}</h1>
      {drawing && (
        <div className="loupe" aria-hidden="true">
          <MarkedLine
            pieces={layoutLine(tokens.get(drawing.line) ?? [], marks!, drawing.line, stroke(drawing.line))}
            activeFamily={family}
          />
        </div>
      )}
      <div
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
          stanzas={[stanza]}
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
            onFamily={setFamily}
            onAbout={() => setLesson(tool)}
            onPutDown={() => go('read')}
          />
        )}
        <StageActions stage={stage} ready={ready} onGo={go} onRate={rate} />
        {parsed.stanzas.length > 1 && (
          <div className="folio" role="group" aria-label={m.stanza}>
            {parsed.stanzas.map((_, i) => (
              <button
                type="button"
                key={i}
                className="action"
                aria-label={`${m.stanza} ${i + 1}`}
                aria-pressed={i === stanza}
                onClick={() => openStanza(i)}
              >
                {roman(i + 1)}
              </button>
            ))}
          </div>
        )}
      </div>
      {lesson && <LessonSheet lesson={lesson} onOpen={setLesson} onClose={() => setLesson(null)} />}
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
  ready,
  onGo,
  onRate,
}: {
  stage: Stage;
  ready: boolean;
  onGo: (stage: Stage) => void;
  onRate: (again: boolean) => void;
}) {
  const { m } = useI18n();
  if (stage === 'check') {
    return (
      <div className="stage-actions">
        <button type="button" className="action soft" onClick={() => onRate(true)}>
          {m.rateNotYet}
        </button>
        <button type="button" className="action" onClick={() => onRate(false)}>
          {m.rateMost}
        </button>
        <button type="button" className="action" onClick={() => onRate(false)}>
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
        <button type="button" className="action" disabled={!ready} onClick={() => onGo(next)}>
          {m[STAGE_ACTION[next]]}
        </button>
      )}
    </div>
  );
}
