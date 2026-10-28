import { useI18n } from '../i18n/context';
import { Sheet } from '../page/Sheet';

/**
 * Fixing a wrongly split word. The word is set large, with a place to tap
 * between every two letters: tap to split there, tap a split to close it.
 */
export function RecutSheet({
  word,
  breaks,
  language,
  onChange,
  onClose,
}: {
  word: string;
  breaks: readonly number[];
  language: string;
  onChange: (breaks: number[]) => void;
  onClose: () => void;
}) {
  const { m, locale } = useI18n();
  const toggle = (at: number) =>
    onChange(breaks.includes(at) ? breaks.filter((b) => b !== at) : [...breaks, at].sort((a, b) => a - b));

  return (
    <div lang={locale}>
      <Sheet title={m.recutTitle} onClose={onClose}>
        <p>{m.recutNote}</p>
        <div className="recut-word" lang={language}>
          {Array.from(word).map((letter, i) => (
            <span key={i} className="recut-piece">
              {i > 0 && (
                <button
                  type="button"
                  className={breaks.includes(i) ? 'recut-gap split' : 'recut-gap'}
                  aria-label={m.splitHere}
                  aria-pressed={breaks.includes(i)}
                  onClick={() => toggle(i)}
                >
                  <span aria-hidden="true">{breaks.includes(i) ? '|' : '·'}</span>
                </button>
              )}
              <span className="recut-letter">{letter}</span>
            </span>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
