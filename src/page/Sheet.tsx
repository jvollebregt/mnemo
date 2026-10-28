import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { useI18n } from '../i18n/context';

/** How far a sheet must be pulled down before letting go puts it away. */
const SWIPE_PX = 80;

/**
 * A sheet that slides up from the bottom of the page, for lessons and
 * explanations. It is put away with *put it away* at its foot, a tap outside
 * it, a swipe down, or Escape. Like every action on the page it is a word, not an icon.
 */
export function Sheet({
  title,
  onClose,
  actions,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Further actions, set on the same line as *put it away*. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { m } = useI18n();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [pull, setPull] = useState(0);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  // A swipe down only counts from the top of the sheet's text, so it never fights scrolling.
  const onTouchStart = (e: TouchEvent) => {
    start.current = (ref.current?.scrollTop ?? 0) <= 0 ? (e.touches[0]?.clientY ?? null) : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (start.current === null) return;
    setPull(Math.max(0, (e.touches[0]?.clientY ?? start.current) - start.current));
  };
  const onTouchEnd = () => {
    if (start.current !== null && pull > SWIPE_PX) onClose();
    start.current = null;
    setPull(0);
  };

  return (
    <>
      <button type="button" className="sheet-backdrop" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={pull ? { transform: `translateY(${pull}px)`, transition: 'none' } : undefined}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="sheet-foot">
          {actions}
          <button type="button" className="action" onClick={onClose}>
            {m.putAway}
          </button>
        </div>
      </div>
    </>
  );
}
