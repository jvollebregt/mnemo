import { Fragment, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { fill, LANGUAGE_NAMES, locales, type Locale, type MessageKey } from '../i18n';
import { build } from '../build';
import { useI18n } from '../i18n/context';
import { useSwipeBack } from '../page/swipe';
import { useStore } from '../store/context';
import { ImportError } from '../store/exchange';
import type { ReciteBy } from '../store/settings';
import { shareFile } from '../store/shareFile';

interface Props {
  /** Whether this device can listen, so that speaking is the default. */
  canSpeak: boolean;
  /** Whether this device can keep a recital as it listens. */
  canRecord: boolean;
  onLocale: (locale: Locale) => void;
  onBack: () => void;
  /** Poems were read in from a file. */
  onImported: () => void;
}

const IMPORT_PROBLEM = { notMnemo: 'importNotMnemo', newer: 'importNewer', damaged: 'importDamaged' } as const;

/** A few words to choose between, the chosen one in ink. */
function Choice<T extends string>({
  label,
  options,
  value,
  onChoose,
}: {
  label: string;
  options: readonly { value: T; text: string; lang?: string }[];
  value: T | undefined;
  onChoose: (value: T) => void;
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {options.map((o, i) => (
        <Fragment key={o.value}>
          {i > 0 && <span aria-hidden="true">·</span>}
          <button
            type="button"
            className="action"
            aria-pressed={o.value === value}
            lang={o.lang}
            onClick={() => onChoose(o.value)}
          >
            {o.text}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

/** The quiet page of choices: language, how to recite, recitals, and the export file. */
export function SettingsPage({ canSpeak, canRecord, onLocale, onBack, onImported }: Props) {
  const { m, locale } = useI18n();
  const { settings, recordings, exchange } = useStore();
  const [reciteBy, setReciteBy] = useState<ReciteBy | undefined>();
  const [keep, setKeep] = useState<boolean | undefined>();
  const [used, setUsed] = useState<number | undefined>();
  const [clearing, setClearing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  useSwipeBack(onBack);

  useEffect(() => {
    let live = true;
    void Promise.all([settings.reciteBy(), settings.keepRecitals(), recordings.bytesUsed()]).then(
      ([by, kept, bytes]) => {
        if (!live) return;
        setReciteBy(by ?? (canSpeak ? 'speaking' : 'typing'));
        setKeep(kept);
        setUsed(bytes);
      },
    );
    return () => {
      live = false;
    };
  }, [settings, recordings, canSpeak]);

  const chooseReciteBy = (by: ReciteBy) => {
    setReciteBy(by);
    void settings.setReciteBy(by);
  };

  const chooseKeep = (kept: boolean) => {
    setKeep(kept);
    void settings.setKeepRecitals(kept);
  };

  const clear = async () => {
    if (!clearing) {
      setClearing(true);
      return;
    }
    await recordings.clear();
    setClearing(false);
    setUsed(0);
  };

  const exportAll = async () => {
    const day = new Date().toISOString().slice(0, 10);
    await shareFile(`mnemo-${day}.json`, await exchange.export());
  };

  const importFrom = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const count = await exchange.import(await file.text());
      setNote(fill(m.importedNote, { count }));
      onImported();
    } catch (error) {
      const key: MessageKey = error instanceof ImportError ? IMPORT_PROBLEM[error.problem] : 'importDamaged';
      setNote(m[key]);
    }
  };

  const size = new Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }).format(
    Math.max(0.1, (used ?? 0) / 1_000_000),
  );

  return (
    <main className="page settings-page">
      <div className="top">
        <button type="button" className="action" onClick={onBack}>
          {m.contents}
        </button>
      </div>
      <h1 className="settings-title">{m.settings}</h1>

      <section className="setting">
        <h2>{m.interfaceLanguage}</h2>
        <Choice
          label={m.interfaceLanguage}
          options={locales.map((l) => ({ value: l, text: LANGUAGE_NAMES[l], lang: l }))}
          value={locale}
          onChoose={onLocale}
        />
      </section>

      <section className="setting">
        <h2>{m.settingsReciting}</h2>
        <Choice<ReciteBy>
          label={m.settingsReciting}
          options={[
            { value: 'speaking', text: m.reciteAloud },
            { value: 'typing', text: m.reciteTyped },
          ]}
          value={reciteBy}
          onChoose={chooseReciteBy}
        />
      </section>

      <section className="setting">
        <h2>{m.settingsRecitals}</h2>
        {canRecord ? (
          <>
            <Choice<'no' | 'yes'>
              label={m.settingsRecitals}
              options={[
                { value: 'no', text: m.recitalsLetGo },
                { value: 'yes', text: m.recitalsKeepLatest },
              ]}
              value={keep === undefined ? undefined : keep ? 'yes' : 'no'}
              onChoose={(v) => chooseKeep(v === 'yes')}
            />
            <p className="setting-note">{m.recitalsNote}</p>
          </>
        ) : (
          <p className="setting-note">{m.recitalsUnavailable}</p>
        )}
        {used !== undefined && (canRecord || used > 0) && (
          <p className="setting-note">
            {used > 0 ? fill(m.recitalsUsed, { size }) : m.recitalsNone}
            {used > 0 && (
              <button type="button" className="action" onClick={() => void clear()}>
                {clearing ? m.clearRecordingsSure : m.clearRecordings}
              </button>
            )}
          </p>
        )}
      </section>

      <section className="setting">
        <h2>{m.settingsYourPoems}</h2>
        <div className="choices">
          <button type="button" className="action" onClick={() => void exportAll()}>
            {m.exportPoems}
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="action" onClick={() => picker.current?.click()}>
            {m.importPoems}
          </button>
        </div>
        <input
          ref={picker}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label={m.importPoems}
          onChange={(e) => void importFrom(e)}
        />
        <p className="setting-note">{m.exchangeNote}</p>
        {note && <p className="note">{note}</p>}
      </section>

      {/* Which build this is, so the reader can tell whether the phone has the newest. */}
      {build.date && (
        <p className="colophon">
          {fill(m.version, {
            date: new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(build.date)),
          })}
          {build.commit && ` · ${build.commit}`}
        </p>
      )}
    </main>
  );
}
