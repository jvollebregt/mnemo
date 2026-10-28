import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../i18n/context';
import { Verse } from '../page/Verse';
import { parsePoem } from '../poem/parse';
import { useStore } from '../store/context';
import type { Poem } from '../store/poems';

const TURN_PHONE = 'turn-phone';

export function PoemPage({ poem, onBack }: { poem: Poem; onBack: () => void }) {
  const { m, locale } = useI18n();
  const { seen } = useStore();
  const parsed = useMemo(() => parsePoem(poem.text), [poem.text]);
  const [turnNote, setTurnNote] = useState(false);

  // The first poem with lines too long for the page teaches that turning the
  // phone sideways shows them whole. The note is shown once, ever.
  const onTurnovers = useCallback(
    (any: boolean) => {
      if (!any) return;
      void seen.has(TURN_PHONE).then(async (already) => {
        if (already) return;
        await seen.mark(TURN_PHONE);
        setTurnNote(true);
      });
    },
    [seen],
  );

  return (
    <main className="page poem-page" lang={poem.language}>
      <div className="top">
        <button type="button" className="action" onClick={onBack}>
          {m.contents}
        </button>
        <span className="byline">{poem.poet}</span>
      </div>
      <h1 className="poem-title">{poem.title}</h1>
      <Verse poem={parsed} onTurnovers={onTurnovers} />
      {turnNote && (
        <p className="note" lang={locale}>
          {m.turnPhoneNote}
        </p>
      )}
    </main>
  );
}
