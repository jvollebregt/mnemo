import { detectLocale, getMessages } from './i18n';

export function App() {
  const m = getMessages(detectLocale());

  return (
    <main className="page">
      <h1 className="running-head">{m.contents}</h1>
      <p className="empty">{m.contentsEmpty}</p>
      <div className="foot">
        {/* Adding a poem arrives in M1. */}
        <button type="button" className="action" disabled>
          {m.addPoem}
        </button>
      </div>
    </main>
  );
}
