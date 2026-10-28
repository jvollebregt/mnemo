import { useEffect, useState } from 'react';
import { useI18n } from './i18n/context';
import { AddPoem } from './screens/AddPoem';
import { Contents } from './screens/Contents';
import { PoemPage } from './screens/PoemPage';
import { useStore } from './store/context';
import type { NewPoem, Poem } from './store/poems';

type View = { name: 'contents'; justAdded?: boolean } | { name: 'add' } | { name: 'poem'; poem: Poem };

export function App() {
  const { poems } = useStore();
  const [view, setView] = useState<View>({ name: 'contents' });
  const [list, setList] = useState<Poem[] | null>(null);

  useEffect(() => {
    let live = true;
    void poems.list().then((all) => live && setList(all));
    return () => {
      live = false;
    };
  }, [poems]);

  const keep = async (poem: NewPoem) => {
    await poems.add(poem);
    setList(await poems.list());
    setView({ name: 'contents', justAdded: true });
  };

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
        />
      ) : (
        <main className="page" />
      );
  }
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
