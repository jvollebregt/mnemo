import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/context';

/**
 * A sheet that slides up from the bottom of the page, for lessons and
 * explanations. It closes when the reader taps outside it (or presses Escape);
 * there is deliberately no close button.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { m } = useI18n();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <>
      <button type="button" className="sheet-backdrop" aria-label={m.putAway} tabIndex={-1} onClick={onClose} />
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </>
  );
}
