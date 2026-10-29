import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Line, ParsedPoem } from '../poem/parse';
import { DEFAULT_FIT, fitSize, hasTurnovers } from './fit';

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
  only,
  focus,
  numeral,
}: {
  poem: ParsedPoem;
  onTurnovers?: (any: boolean) => void;
  className?: string;
  /** Sets a line's text with marks; the plain text by default. It must keep every character of the line. */
  renderLine?: (line: Line) => ReactNode;
  /** Something for the right-hand margin, beside the end of the line. */
  aside?: (line: Line) => ReactNode;
  /** Which lines to set, by number; all of them by default. The type size is always fitted to the whole poem. */
  only?: ReadonlySet<number>;
  /** The lines being worked on. Stanzas with none of them are set faint around them. */
  focus?: ReadonlySet<number>;
  /** Something for the left-hand margin beside a stanza's first line, such as its numeral. */
  numeral?: (stanza: number) => ReactNode;
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
      {poem.stanzas.map((stanza, index) => {
        const shown = only ? stanza.lines.filter((line) => only.has(line.number)) : stanza.lines;
        const faint = focus && !stanza.lines.some((line) => focus.has(line.number));
        return shown.length === 0 ? null : (
          <div
            key={stanza.lines[0]?.number}
            className={faint ? 'stanza faint' : focus ? 'stanza in-focus' : 'stanza'}
            data-stanza={index}
          >
            {shown.map((line, i) => (
              <div className="line" key={line.number} data-line={line.number}>
                {/* While learning a poem the reader goes by stanza, not by line number. */}
                <span className="line-number" aria-hidden={i === 0 && numeral ? undefined : true}>
                  {i === 0 ? numeral?.(index) : null}
                </span>
                <div className="line-text">{renderLine ? renderLine(line) : line.text}</div>
                {aside?.(line)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
