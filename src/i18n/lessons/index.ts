import type { Locale } from '../index';
import { respell, type Spelling } from '../region';
import { en } from './en';
import { nl } from './nl';

/**
 * The short lessons that open in a bottom sheet the first time a pencil tool
 * is picked. All of them are drafts: Joos co-writes and approves the final
 * texts, after Mary Oliver's handbooks (in our own words). Dutch lessons are
 * written fresh with Dutch public-domain poems, not translated.
 */
export const LESSONS = ['beats', 'beatsMore', 'echoes', 'pauses'] as const;
export type LessonKey = (typeof LESSONS)[number];

export interface Lesson {
  title: string;
  paragraphs: readonly string[];
  tryIt: string;
  /** A follow-on lesson behind *more about this*, where the names live. */
  more?: LessonKey;
  /** Still to be rewritten and approved. Shown as such in the sheet. */
  draft: boolean;
}

export type Lessons = Record<LessonKey, Lesson>;

const catalogs: Record<Locale, Lessons> = { en, nl };

export function getLessons(locale: Locale, spelling: Spelling = 'american'): Lessons {
  if (locale !== 'en' || spelling === 'american') return catalogs[locale];
  const spell = (text: string) => respell(text, spelling);
  const lessons = catalogs[locale];
  const respelled = (l: Lesson): Lesson => ({ ...l, title: spell(l.title), paragraphs: l.paragraphs.map(spell), tryIt: spell(l.tryIt) });
  return Object.fromEntries(LESSONS.map((key) => [key, respelled(lessons[key])])) as Lessons;
}
