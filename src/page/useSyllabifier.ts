import { useEffect, useMemo, useState } from 'react';
import type { PoemLanguage } from '../poem/language';
import { loadEnglishCounts } from '../pencil/syllables';
import type { Syllabifier } from '../pencil/tokens';

/**
 * How to cut this poem's words into syllables. English waits for the
 * pronouncing dictionary, so syllables never shift under a reader's marks.
 */
export function useSyllabifier(language: PoemLanguage): Syllabifier | null {
  const [english, setEnglish] = useState<Syllabifier | null>(null);
  const other = useMemo(() => ({ language }), [language]);

  useEffect(() => {
    if (language !== 'en') return;
    let live = true;
    void loadEnglishCounts().then((counts) => live && setEnglish({ language: 'en', counts }));
    return () => {
      live = false;
    };
  }, [language]);

  return language === 'en' ? english : other;
}
