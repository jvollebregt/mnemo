import { describe, expect, it } from 'vitest';
import { locales } from '../index';
import { getLessons, LESSONS } from './index';

describe('lessons', () => {
  it('exist in every language, with the same follow-ons', () => {
    const shape = (locale: (typeof locales)[number]) =>
      Object.entries(getLessons(locale))
        .map(([key, lesson]) => [key, lesson.more ?? null])
        .sort();
    for (const locale of locales) {
      expect(Object.keys(getLessons(locale)).sort()).toEqual([...LESSONS].sort());
      expect(shape(locale)).toEqual(shape('en'));
    }
  });

  it('have a title, some words and something to try', () => {
    for (const locale of locales) {
      for (const lesson of Object.values(getLessons(locale))) {
        expect(lesson.title.trim()).not.toBe('');
        expect(lesson.paragraphs.length).toBeGreaterThan(0);
        expect(lesson.tryIt.trim()).not.toBe('');
      }
    }
  });
});
