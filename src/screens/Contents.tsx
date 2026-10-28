import { LANGUAGE_NAMES, locales, type Locale } from '../i18n';
import { useI18n } from '../i18n/context';
import type { Poem } from '../store/poems';

interface Props {
  poems: readonly Poem[];
  justAdded: boolean;
  onOpen: (poem: Poem) => void;
  onAdd: () => void;
  onLocale: (locale: Locale) => void;
}

export function Contents({ poems, justAdded, onOpen, onAdd, onLocale }: Props) {
  const { m, locale } = useI18n();

  return (
    <main className="page">
      <h1 className="running-head">{m.contents}</h1>
      {poems.length === 0 ? (
        <p className="empty">{m.contentsEmpty}</p>
      ) : (
        <ul className="entries">
          {poems.map((poem) => (
            <li key={poem.id}>
              <button type="button" className="entry" onClick={() => onOpen(poem)}>
                <span className="entry-title">{poem.title}</span>
                <span className="entry-leader" aria-hidden="true" />
                {/* Every poem is taking root until scheduling arrives in M5. */}
                <span className="entry-state">{m.stateTakingRoot}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {justAdded && <p className="note">{m.addedNote}</p>}
      <div className="foot contents-foot">
        <button type="button" className="action" onClick={onAdd}>
          {m.addPoem}
        </button>
        <div className="interface-language" role="group" aria-label={m.interfaceLanguage}>
          {locales.map((l, i) => (
            <span key={l}>
              {i > 0 && <span aria-hidden="true">·</span>}
              <button type="button" className="action" aria-pressed={l === locale} lang={l} onClick={() => onLocale(l)}>
                {LANGUAGE_NAMES[l]}
              </button>
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
