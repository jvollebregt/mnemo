import { useI18n } from '../i18n/context';
import type { PoemLanguage } from '../poem/language';
import type { ReciteBy } from '../store/settings';

interface Props {
  by: ReciteBy;
  canSpeak: boolean;
  /** What was typed so far. */
  text: string;
  hearing: boolean;
  /** Something was said, and listening is paused. */
  paused: boolean;
  language: PoemLanguage;
  onType: (text: string) => void;
  onListen: () => void;
  onPause: () => void;
  onDone: () => void;
  onBack: () => void;
  onSwitch: (by: ReciteBy) => void;
}

/**
 * The foot of the recital. Aloud, the page itself is the record: each word
 * comes back in its place as it is said, so nothing is written out here, and
 * the words at the foot say only how to go on. Typed, the words go on a ruled
 * line. Either way works fully.
 */
export function ReciteBox({ by, canSpeak, text, hearing, paused, language, onType, onListen, onPause, onDone, onBack, onSwitch }: Props) {
  const { m } = useI18n();
  const action = (label: string, onClick: () => void, soft = false) => (
    <button type="button" className={soft ? 'action soft' : 'action'} onClick={onClick}>
      {label}
    </button>
  );
  if (by === 'typing') {
    return (
      <>
        <textarea
          className="recite"
          lang={language}
          aria-label={m.recite}
          placeholder={m.recitePlaceholder}
          value={text}
          onChange={(e) => onType(e.target.value)}
          rows={3}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="stage-actions">
          {action(m.back, onBack, true)}
          {action(m.reciteDone, onDone)}
          {canSpeak && action(m.reciteBySpeaking, () => onSwitch('speaking'), true)}
        </div>
      </>
    );
  }
  if (hearing || paused) {
    return (
      <div className="stage-actions">
        {hearing ? action(m.recitePause, onPause) : action(m.reciteGoOn, onListen)}
        {action(m.reciteDone, onDone)}
        {!hearing && action(m.reciteByTyping, () => onSwitch('typing'), true)}
      </div>
    );
  }
  return (
    <div className="stage-actions">
      {action(m.back, onBack, true)}
      {action(m.reciteSay, onListen)}
      {action(m.reciteByTyping, () => onSwitch('typing'), true)}
    </div>
  );
}
