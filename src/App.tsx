import { useEffect, useMemo, useState } from 'react';
import type { Locale } from './i18n';
import { I18nContext, i18nFor, useI18n } from './i18n/context';
import { AddPoem } from './screens/AddPoem';
import { Contents } from './screens/Contents';
import { PoemPage } from './screens/PoemPage';
import { useStore } from './store/context';
import type { NewPoem, Poem } from './store/poems';

type View = { name: 'contents'; justAdded?: boolean } | { name: 'add' } | { name: 'poem'; poem: Poem };

export function App() {
  const { poems, settings } = useStore();
  const { locale: phoneLocale } = useI18n();
  const [view, setView] = useState<View>({ name: 'contents' });
  const [list, setList] = useState<Poem[] | null>(null);
  // The interface follows the phone's language until the reader picks one.
  const [chosen, setChosen] = useState<Locale | undefined>();
  const i18n = useMemo(() => i18nFor(chosen ?? phoneLocale), [chosen, phoneLocale]);

  useEffect(() => {
    let live = true;
    void Promise.all([poems.list(), settings.locale()]).then(([all, locale]) => {
      if (!live) return;
      setChosen(locale);
      setList(all);
    });
    return () => {
      live = false;
    };
  }, [poems, settings]);

  const keep = async (poem: NewPoem) => {
    await poems.add(poem);
    setList(await poems.list());
    setView({ name: 'contents', justAdded: true });
  };

  const chooseLocale = (locale: Locale) => {
    setChosen(locale);
    void settings.setLocale(locale);
  };

  const screen = () => {
    switch (view.name) {
      case 'add':
        return <AddPoem onKeep={keep} onCancel={() => setView({ name: 'contents' })} />;
      case 'poem':
        return <PoemPage poem={view.poem} onBack={() => setView({ name: 'contents' })} />;
      case 'contents':
        // Wait for the list rather than flashing the empty page.
        return list ? (
          <Contents
            poems={list}
            justAdded={view.justAdded ?? false}
            onOpen={(poem) => setView({ name: 'poem', poem })}
            onAdd={() => setView({ name: 'add' })}
            onLocale={chooseLocale}
          />
        ) : (
          <main className="page" />
        );
    }
  };

  return <I18nContext.Provider value={i18n}>{screen()}</I18nContext.Provider>;
}

/** Shown if the poems can't be opened at all. */
export function OpenFailed() {
  const { m } = useI18n();
  return (
    <main className="page">
      <p className="empty">{m.openFailed}</p>
    </main>
  );
}
