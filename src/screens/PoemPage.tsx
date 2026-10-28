import { useMemo } from 'react';
import { useI18n } from '../i18n/context';
import { Verse } from '../page/Verse';
import { parsePoem } from '../poem/parse';
import type { Poem } from '../store/poems';

export function PoemPage({ poem, onBack }: { poem: Poem; onBack: () => void }) {
  const { m } = useI18n();
  const parsed = useMemo(() => parsePoem(poem.text), [poem.text]);

  return (
    <main className="page poem-page" lang={poem.language}>
      <div className="top">
        <button type="button" className="action" onClick={onBack}>
          {m.contents}
        </button>
        <span className="byline">{poem.poet}</span>
      </div>
      <h1 className="poem-title">{poem.title}</h1>
      <Verse poem={parsed} />
    </main>
  );
}
