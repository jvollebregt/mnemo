import { useI18n } from '../i18n/context';
import { poemState, type Card, type PoemState, type Unit } from '../learn/schedule';
import { parsePoem } from '../poem/parse';
import type { Poem } from '../store/poems';

const PHRASE = { takingRoot: 'stateTakingRoot', fading: 'stateFading', byHeart: 'stateByHeart' } as const;

/** How a poem stands today: taking root, fading (due), or by heart. */
function stateOf(poem: Poem, cards: ReadonlyMap<Unit, Card> | undefined, now: Date): PoemState {
  const stanzaLines = parsePoem(poem.text).stanzas.map((s) => s.lines.map((l) => l.number));
  return poemState(stanzaLines, cards ?? new Map(), now);
}

interface Props {
  poems: readonly Poem[];
  /** Each poem's schedule, by poem id. */
  cards: ReadonlyMap<string, ReadonlyMap<Unit, Card>>;
  justAdded: boolean;
  onOpen: (poem: Poem) => void;
  onAdd: () => void;
  onSettings: () => void;
}

export function Contents({ poems, cards, justAdded, onOpen, onAdd, onSettings }: Props) {
  const { m } = useI18n();
  const now = new Date();

  return (
    <main className="page">
      <h1 className="running-head">{m.contents}</h1>
      {poems.length === 0 ? (
        <p className="empty">{m.contentsEmpty}</p>
      ) : (
        <ul className="entries">
          {poems.map((poem) => {
            const state = stateOf(poem, cards.get(poem.id), now);
            return (
              <li key={poem.id}>
                <button type="button" className="entry" onClick={() => onOpen(poem)}>
                  <span className="entry-title">{poem.title}</span>
                  <span className="entry-leader" aria-hidden="true" />
                  <span className={state === 'fading' ? 'entry-state fading' : 'entry-state'}>{m[PHRASE[state]]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {justAdded && <p className="note">{m.addedNote}</p>}
      <div className="foot contents-foot">
        <button type="button" className="action" onClick={onAdd}>
          {m.addPoem}
        </button>
        <button type="button" className="action quiet" onClick={onSettings}>
          {m.settings}
        </button>
      </div>
    </main>
  );
}
