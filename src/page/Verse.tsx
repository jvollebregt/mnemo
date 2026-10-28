import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ParsedPoem } from '../poem/parse';
import { DEFAULT_FIT, fitSize, lineLabel } from './fit';

const REFERENCE_SIZE = 20;

/**
 * A poem set on the page. The type size is chosen once so that most lines fit
 * the measure; a line that still doesn't fit turns over with a hanging indent
 * and is still one line, with one number.
 */
export function Verse({ poem }: { poem: ParsedPoem }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number>(DEFAULT_FIT.largest);
  const lines = useMemo(() => poem.stanzas.flatMap((s) => s.lines), [poem]);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    const column = columnRef.current;
    if (!measure || !column) return;

    const fit = () => {
      const widths = Array.from(measure.children, (el) => el.getBoundingClientRect().width);
      setSize(fitSize({ widths, referenceSize: REFERENCE_SIZE, measure: column.clientWidth }));
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
  }, [lines]);

  return (
    <div className="verse" style={{ fontSize: `${size}px` }}>
      <div ref={measureRef} className="verse-measure" aria-hidden="true">
        {lines.map((line) => (
          <span key={line.number}>{line.text}</span>
        ))}
      </div>
      {poem.stanzas.map((stanza) => (
        <div className="stanza" key={stanza.lines[0]?.number}>
          {stanza.lines.map((line) => (
            <div className="line" key={line.number}>
              <span className="line-number" aria-hidden="true">
                {lineLabel(line.number)}
              </span>
              <div className="line-text" ref={line.number === 1 ? columnRef : undefined}>
                {line.text}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
