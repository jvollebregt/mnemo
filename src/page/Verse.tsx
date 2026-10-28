import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Line, ParsedPoem } from '../poem/parse';
import { DEFAULT_FIT, fitSize, hasTurnovers, lineLabel } from './fit';

const REFERENCE_SIZE = 20;

/**
 * A poem set on the page. The type size is chosen once so that most lines fit
 * the measure; a line that still doesn't fit turns over with a hanging indent
 * and is still one line, with one number.
 */
export function Verse({
  poem,
  onTurnovers,
  className,
  renderLine,
  aside,
  stanzas,
}: {
  poem: ParsedPoem;
  onTurnovers?: (any: boolean) => void;
  className?: string;
  /** Sets a line's text with marks; the plain text by default. It must keep every character of the line. */
  renderLine?: (line: Line) => ReactNode;
  /** Something for the right-hand margin, beside the end of the line. */
  aside?: (line: Line) => ReactNode;
  /** Which stanzas to set, by index; all of them by default. The type size is always fitted to the whole poem. */
  stanzas?: readonly number[];
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  // Every line's text spans the whole verse column, so the column's width is the measure.
  const columnRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number>(DEFAULT_FIT.largest);
  const lines = useMemo(() => poem.stanzas.flatMap((s) => s.lines), [poem]);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    const column = columnRef.current;
    if (!measure || !column) return;

    const fit = () => {
      const widths = Array.from(measure.children, (el) => el.getBoundingClientRect().width);
      const options = { widths, referenceSize: REFERENCE_SIZE, measure: column.clientWidth };
      const size = fitSize(options);
      setSize(size);
      onTurnovers?.(hasTurnovers(options, size));
    };
    fit();
    // Measure again once the book face has loaded, and when the page changes width.
    let live = true;
    void document.fonts?.ready.then(() => live && fit());
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    observer?.observe(column);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [lines, onTurnovers]);

  return (
    <div ref={columnRef} className={className ? `verse ${className}` : 'verse'} style={{ fontSize: `${size}px` }}>
      <div ref={measureRef} className="verse-measure" aria-hidden="true">
        {lines.map((line) => (
          <span key={line.number}>{line.text}</span>
        ))}
      </div>
      {poem.stanzas.map((stanza, index) => (stanzas && !stanzas.includes(index) ? null : (
        <div className="stanza" key={stanza.lines[0]?.number}>
          {stanza.lines.map((line) => (
            <div className="line" key={line.number} data-line={line.number}>
              <span className="line-number" aria-hidden="true">
                {lineLabel(line.number)}
              </span>
              <div className="line-text">
                {renderLine ? renderLine(line) : line.text}
              </div>
              {aside?.(line)}
            </div>
          ))}
        </div>
      )))}
    </div>
  );
}
