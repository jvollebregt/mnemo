import { useI18n } from '../i18n/context';
import type { Poem } from '../store/poems';

interface Props {
  poems: readonly Poem[];
  justAdded: boolean;
  onOpen: (poem: Poem) => void;
  onAdd: () => void;
}

export function Contents({ poems, justAdded, onOpen, onAdd }: Props) {
  const { m } = useI18n();

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
      <div className="foot">
        <button type="button" className="action" onClick={onAdd}>
          {m.addPoem}
        </button>
      </div>
    </main>
  );
}
