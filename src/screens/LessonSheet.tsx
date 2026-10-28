import { useI18n } from '../i18n/context';
import { getLessons, type LessonKey } from '../i18n/lessons';
import { Sheet } from '../page/Sheet';

/** A short lesson, opened the first time a pencil tool is picked, or from *about …* under the tools. */
export function LessonSheet({ lesson, onOpen, onClose }: { lesson: LessonKey; onOpen: (key: LessonKey) => void; onClose: () => void }) {
  const { m, locale } = useI18n();
  const shown = getLessons(locale)[lesson];
  return (
    <div lang={locale}>
      <Sheet key={lesson} title={shown.title} onClose={onClose}>
        {shown.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="try-it">{shown.tryIt}</p>
        {shown.draft && <p className="draft-note">{m.draftLesson}</p>}
        {shown.more && (
          <div className="sheet-more">
            <button type="button" className="action" onClick={() => onOpen(shown.more!)}>
              {m.moreAboutThis}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
