import { fill, type MessageKey } from '../i18n';
import { useI18n } from '../i18n/context';
import { getLessons, type LessonKey } from '../i18n/lessons';
import { Sheet } from '../page/Sheet';

const ABOUT: Partial<Record<LessonKey, MessageKey>> = { beats: 'aboutBeats', echoes: 'aboutEchoes', pauses: 'aboutPauses' };

/** A short lesson, opened the first time a pencil tool is picked, or from *about …* under the tools. */
export function LessonSheet({
  lesson,
  first = false,
  onOpen,
  onClose,
}: {
  lesson: LessonKey;
  /** Opened by itself, the first time: say that it won't again, and where it lives. */
  first?: boolean;
  onOpen: (key: LessonKey) => void;
  onClose: () => void;
}) {
  const { m, locale } = useI18n();
  const shown = getLessons(locale)[lesson];
  return (
    <div lang={locale}>
      <Sheet
        key={lesson}
        title={shown.title}
        onClose={onClose}
        actions={
          shown.more && (
            <button type="button" className="action" onClick={() => onOpen(shown.more!)}>
              {m.moreAboutThis}
            </button>
          )
        }
      >
        {shown.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="try-it">{shown.tryIt}</p>
        {first && ABOUT[lesson] && <p className="lesson-once">{fill(m.lessonOnce, { about: m[ABOUT[lesson]] })}</p>}
        {shown.draft && <p className="draft-note">{m.draftLesson}</p>}
      </Sheet>
    </div>
  );
}
