import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../i18n/context';
import { Sheet } from '../page/Sheet';
import { Verse } from '../page/Verse';
import { parsePoem } from '../poem/parse';
import { useStore } from '../store/context';
import type { Poem } from '../store/poems';

const LONG_LINES = 'long-lines';

export function PoemPage({ poem, onBack }: { poem: Poem; onBack: () => void }) {
  const { m, locale } = useI18n();
  const { seen } = useStore();
  const parsed = useMemo(() => parsePoem(poem.text), [poem.text]);
  const [explainLongLines, setExplainLongLines] = useState(false);

  // The first poem with lines too long for the page explains its turnovers
  // and suggests turning the phone sideways. Shown once, ever.
  const onTurnovers = useCallback(
    (any: boolean) => {
      if (!any) return;
      void seen.has(LONG_LINES).then(async (already) => {
        if (already) return;
        await seen.mark(LONG_LINES);
        setExplainLongLines(true);
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
      {explainLongLines && (
        <div lang={locale}>
          <Sheet title={m.longLinesTitle} onClose={() => setExplainLongLines(false)}>
            <p>{m.longLines1}</p>
            <p>{m.longLines2}</p>
            <p>{m.longLines3}</p>
          </Sheet>
        </div>
      )}
    </main>
  );
}
