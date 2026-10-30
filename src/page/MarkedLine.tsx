import type { ReactNode } from 'react';
import type { EchoFamily, EchoStyle } from '../pencil/marks';
import type { Piece, Run } from '../pencil/layout';

const pieceClass = (piece: Piece) => {
  const kind = { syllable: 'syl', word: 'word', space: 'gap', punct: 'stop', end: 'gap end' }[piece.kind];
  return [kind, piece.mark, piece.pause && 'pause'].filter(Boolean).join(' ');
};

const runClass = (run: Run, active?: EchoFamily) =>
  [
    run.echo && 'echo',
    run.style && `echo-${run.style}`,
    run.echo && run.preview && 'preview',
    run.echo && active && !run.preview && run.echo !== active && 'dim',
    run.look,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

/** Doubled dotted, dashed and wavy lines: a second underline, set a little lower, on a span inside the first. */
const TWINNED: readonly EchoStyle[] = [9, 10, 11];

/** The letters of an echo, with the second line its style may need. */
export function Underlined({ style, children }: { style?: EchoStyle; children: ReactNode }) {
  return style && TWINNED.includes(style) ? <span className="twin">{children}</span> : children;
}

/**
 * A line set with the reader's marks. Every letter is its own element, so a
 * stroke can snap to letter edges, but the text flows exactly as the plain
 * line does: the same breaks, the same turnovers.
 */
export function MarkedLine({ pieces, activeFamily }: { pieces: readonly Piece[]; activeFamily?: EchoFamily }) {
  return (
    <>
      {pieces.map((piece) => (
        <span key={piece.start} className={pieceClass(piece)}>
          {piece.runs.map((run) => (
            <span key={run.glyphs[0]?.at} className={runClass(run, activeFamily)}>
              <Underlined style={run.style}>
                {run.glyphs.map((g) => (
                  <span key={g.at} data-at={g.at}>
                    {g.ch}
                  </span>
                ))}
              </Underlined>
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
