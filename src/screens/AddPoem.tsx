import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/context';
import { canJoin, closeUp, guessLanguage, looksDoubleSpaced, mend, readPasted, suspectBreaks } from '../poem/intake';
import { lineLabel } from '../page/fit';
import { poemLanguages, type PoemLanguage } from '../poem/language';
import type { NewPoem } from '../store/poems';

// Language names are always written in their own language.
const LANGUAGE_NAMES: Record<PoemLanguage, string> = { en: 'English', nl: 'Nederlands' };

interface Props {
  onKeep: (poem: NewPoem) => Promise<void>;
  onCancel: () => void;
}

interface Proof {
  title: string;
  poet: string;
  language: PoemLanguage;
  /** Ask the reader, because the words didn't make the language clear. */
  askLanguage: boolean;
  lines: string[];
  joins: Set<number>;
  lastJoined: boolean;
}

/**
 * Adding a poem takes two pages. First a blank sheet to paste onto; then a
 * proof, where the reader checks the title and poet and mends any line the
 * source page broke. Nothing is changed without the reader's tap.
 */
export function AddPoem({ onKeep, onCancel }: Props) {
  const { m, locale } = useI18n();
  const [text, setText] = useState('');
  const [proof, setProof] = useState<Proof | null>(null);
  const [saving, setSaving] = useState(false);

  const setPage = () => {
    const pasted = readPasted(text);
    const guess = guessLanguage(pasted.lines.join('\n'), locale);
    setProof({
      ...pasted,
      language: guess.language,
      askLanguage: !guess.sure,
      joins: new Set(),
      lastJoined: false,
    });
  };

  if (!proof) {
    return (
      <main className="page">
        <div className="top">
          <button type="button" className="action" onClick={onCancel}>
            {m.contents}
          </button>
        </div>
        <textarea
          className="paste"
          aria-label={m.pastePlaceholder}
          placeholder={m.pastePlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="note">{m.pasteNote}</p>
        <div className="foot">
          <button type="button" className="action" disabled={!text.trim()} onClick={setPage}>
            {m.setPage}
          </button>
        </div>
      </main>
    );
  }

  const update = (patch: Partial<Proof>) => setProof({ ...proof, ...patch });

  const toggle = (index: number) => {
    const joins = new Set(proof.joins);
    const joining = !joins.has(index);
    if (joining) joins.add(index);
    else joins.delete(index);
    update({ joins, lastJoined: joining });
  };

  const keep = async () => {
    setSaving(true);
    try {
      await onKeep({ title: proof.title, poet: proof.poet, language: proof.language, text: mend(proof.lines, proof.joins) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page poem-page">
      <div className="top">
        <button type="button" className="action" onClick={() => setProof(null)}>
          {m.back}
        </button>
      </div>
      <input
        className="field title"
        aria-label={m.titlePlaceholder}
        placeholder={m.titlePlaceholder}
        value={proof.title}
        onChange={(e) => update({ title: e.target.value })}
      />
      <input
        className="field poet"
        aria-label={m.poetPlaceholder}
        placeholder={m.poetPlaceholder}
        value={proof.poet}
        onChange={(e) => update({ poet: e.target.value })}
      />
      {proof.askLanguage && (
        <div className="which-language">
          <span>{m.languageQuestion}</span>
          {poemLanguages.map((language, i) => (
            <span key={language}>
              {i > 0 && <span aria-hidden="true">·</span>}
              <button
                type="button"
                className="action"
                aria-pressed={proof.language === language}
                lang={language}
                onClick={() => update({ language })}
              >
                {LANGUAGE_NAMES[language]}
              </button>
            </span>
          ))}
        </div>
      )}
      <ProofLines lines={proof.lines} joins={proof.joins} language={proof.language} onToggle={toggle} />
      <ProofNotes
        proof={proof}
        onCloseUp={() => update({ lines: closeUp(proof.lines), joins: new Set(), lastJoined: false })}
      />
      <div className="foot">
        <button type="button" className="action" disabled={!proof.title.trim() || saving} onClick={() => void keep()}>
          {m.keepIt}
        </button>
      </div>
    </main>
  );
}

interface ProofLine {
  number: number;
  stanzaStart: boolean;
  suspect: boolean;
  pieces: { index: number; text: string; joined: boolean }[];
}

/** Groups the pasted lines into the poet's lines, as the reader has mended them. */
function proofLines(lines: readonly string[], joins: ReadonlySet<number>): ProofLine[] {
  const suspects = new Set(suspectBreaks(lines));
  const out: ProofLine[] = [];
  let stanzaStart = true;
  lines.forEach((text, index) => {
    if (!text.trim()) {
      stanzaStart = true;
      return;
    }
    const joined = joins.has(index) && canJoin(lines, index);
    const last = out[out.length - 1];
    if (joined && last) {
      last.pieces.push({ index, text: text.trim(), joined: true });
    } else {
      out.push({ number: out.length + 1, stanzaStart, suspect: suspects.has(index), pieces: [{ index, text, joined: false }] });
    }
    stanzaStart = false;
  });
  return out;
}

function ProofLines({
  lines,
  joins,
  language,
  onToggle,
}: {
  lines: readonly string[];
  joins: ReadonlySet<number>;
  language: PoemLanguage;
  onToggle: (index: number) => void;
}) {
  const shown = useMemo(() => proofLines(lines, joins), [lines, joins]);
  return (
    <div className="proof" lang={language}>
      {shown.map((line) => (
        <div key={line.pieces[0]?.index} className={line.stanzaStart && line.number > 1 ? 'line stanza-start' : 'line'}>
          {/* A line that looks broken carries the mark in the margin, where its number would go. */}
          <span className={line.suspect ? 'line-number suspect-mark' : 'line-number'} aria-hidden="true">
            {line.suspect ? '⁀' : lineLabel(line.number)}
          </span>
          <div className="line-text">
            {line.pieces.map((piece) => (
              <button
                type="button"
                key={piece.index}
                className="piece"
                aria-pressed={canJoin(lines, piece.index) ? piece.joined : undefined}
                disabled={!canJoin(lines, piece.index)}
                onClick={() => onToggle(piece.index)}
              >
                {piece.joined && (
                  <span className="join-mark" aria-hidden="true">
                    {'⁀\u2009'}
                  </span>
                )}
                {piece.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProofNotes({ proof, onCloseUp }: { proof: Proof; onCloseUp: () => void }) {
  const { m } = useI18n();
  const unjoined = suspectBreaks(proof.lines).filter((i) => !proof.joins.has(i)).length;

  if (looksDoubleSpaced(proof.lines)) {
    return (
      <>
        <p className="note">{m.doubleSpacedNote}</p>
        <div className="note-action">
          <button type="button" className="action" onClick={onCloseUp}>
            {m.closeUp}
          </button>
        </div>
      </>
    );
  }
  if (proof.lastJoined) return <p className="note">{m.joinedNote}</p>;
  if (unjoined > 0) return <p className="note">{unjoined === 1 ? m.brokenNoteOne : m.brokenNoteMany}</p>;
  return null;
}
