import { useI18n } from '../i18n/context';
import type { PoemLanguage } from '../poem/language';
import type { ReciteBy } from '../store/settings';

interface Props {
  by: ReciteBy;
  canSpeak: boolean;
  /** What was said or typed so far. */
  text: string;
  hearing: boolean;
  language: PoemLanguage;
  onType: (text: string) => void;
  onListen: () => void;
  onSwitch: (by: ReciteBy) => void;
}

/**
 * Where the reader recites at the check: aloud, with what was heard written
 * out on the ruled line, or typed onto it. Either way works fully.
 */
export function ReciteBox({ by, canSpeak, text, hearing, language, onType, onListen, onSwitch }: Props) {
  const { m } = useI18n();
  return (
    <>
      {by === 'typing' ? (
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
      ) : (
        <p className={text ? 'recite heard' : 'recite heard empty'} lang={text ? language : undefined} aria-live="polite">
          {text || (hearing ? m.reciteListening : m.reciteSpeakPrompt)}
        </p>
      )}
      <div className="stage-actions">
        {by === 'speaking' && !hearing && (
          <button type="button" className="action" onClick={onListen}>
            {m.reciteSay}
          </button>
        )}
        {by === 'speaking' ? (
          <button type="button" className="action soft" onClick={() => onSwitch('typing')}>
            {m.reciteByTyping}
          </button>
        ) : (
          canSpeak && (
            <button type="button" className="action soft" onClick={() => onSwitch('speaking')}>
              {m.reciteBySpeaking}
            </button>
          )
        )}
      </div>
    </>
  );
}
