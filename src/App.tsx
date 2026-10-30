import { useEffect, useMemo, useState } from 'react';
import type { Locale } from './i18n';
import type { Card, Unit } from './learn/schedule';
import { I18nContext, i18nFor, useI18n } from './i18n/context';
import { AddPoem } from './screens/AddPoem';
import { Contents } from './screens/Contents';
import { deviceEar, deviceRecorder } from './recite/device';
import { PoemPage } from './screens/PoemPage';
import { SettingsPage } from './screens/SettingsPage';
import { useStore } from './store/context';
import type { NewPoem, Poem } from './store/poems';

type View =
  | { name: 'contents'; justAdded?: boolean }
  | { name: 'add'; correcting?: Poem }
  | { name: 'poem'; poem: Poem } | { name: 'settings' };

export function App() {
  const { poems, schedule, settings, recordings } = useStore();
  const { locale: phoneLocale } = useI18n();
  const [view, setView] = useState<View>({ name: 'contents' });
  const [list, setList] = useState<Poem[] | null>(null);
  const [cards, setCards] = useState<ReadonlyMap<string, ReadonlyMap<Unit, Card>>>(new Map());
  // The interface follows the phone's language until the reader picks one.
  const [chosen, setChosen] = useState<Locale | undefined>();
  const i18n = useMemo(() => i18nFor(chosen ?? phoneLocale), [chosen, phoneLocale]);

  useEffect(() => {
    let live = true;
    void Promise.all([poems.list(), schedule.all(), settings.locale()]).then(([all, scheduled, locale]) => {
      if (!live) return;
      setChosen(locale);
      setCards(scheduled);
      setList(all);
    });
    return () => {
      live = false;
    };
  }, [poems, schedule, settings]);

  // Back from a poem, the contents say how each one stands now.
  const toContents = async () => {
    const [all, scheduled] = await Promise.all([poems.list(), schedule.all()]);
    setCards(scheduled);
    setList(all);
    setView({ name: 'contents' });
  };

  const remove = async (poem: Poem) => {
    await recordings.forget(poem.id);
    await poems.remove(poem.id);
    await toContents();
  };

  const correct = async (before: Poem, poem: NewPoem) => {
    const corrected = await poems.correct(before, poem);
    setView({ name: 'poem', poem: corrected });
  };

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
        if (view.correcting) {
          const before = view.correcting;
          return (
            <AddPoem
              correcting={before}
              onKeep={(poem) => correct(before, poem)}
              onCancel={() => setView({ name: 'poem', poem: before })}
              onContents={() => void toContents()}
              onRemove={() => void remove(before)}
            />
          );
        }
        return <AddPoem onKeep={keep} onCancel={() => setView({ name: 'contents' })} />;
      case 'settings':
        return (
          <SettingsPage
            canSpeak={deviceEar.available}
            canRecord={deviceRecorder.available}
            onLocale={chooseLocale}
            onBack={() => void toContents()}
            onImported={() => void poems.list().then(setList)}
          />
        );
      case 'poem':
        return (
          <PoemPage
            // A corrected poem is a fresh page, with its marks and schedule read again.
            key={`${view.poem.id}:${view.poem.updatedAt}`}
            poem={view.poem}
            onBack={() => void toContents()}
            onCorrect={() => setView({ name: 'add', correcting: view.poem })}
          />
        );
      case 'contents':
        // Wait for the list rather than flashing the empty page.
        return list ? (
          <Contents
            poems={list}
            cards={cards}
            justAdded={view.justAdded ?? false}
            onOpen={(poem) => setView({ name: 'poem', poem })}
            onAdd={() => setView({ name: 'add' })}
            onSettings={() => setView({ name: 'settings' })}
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
