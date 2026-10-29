import { describe, expect, it } from 'vitest';
import { i18nFor } from './context';
import { getLessons } from './lessons';
import { respell, speechLanguage, spellingFor } from './region';

describe('the phone region', () => {
  it('spells English the American way only in American regions', () => {
    expect(spellingFor(['en-US'])).toBe('american');
    expect(spellingFor(['en-GB'])).toBe('british');
    expect(spellingFor(['en-NL', 'nl-NL'])).toBe('british');
    expect(spellingFor(['nl-NL'])).toBe('british');
    expect(spellingFor(['en-CA'])).toBe('british');
    expect(spellingFor(['en'])).toBe('british');
  });

  it('listens for the phone’s own accent, where the phone knows it', () => {
    expect(speechLanguage('en', ['en-AU'])).toBe('en-AU');
    expect(speechLanguage('en', ['en-US'])).toBe('en-US');
    // An English phone set to the Netherlands, or a Dutch one, hears English the British way.
    expect(speechLanguage('en', ['en-NL'])).toBe('en-GB');
    expect(speechLanguage('en', ['nl-NL'])).toBe('en-GB');
    expect(speechLanguage('nl', ['nl-BE'])).toBe('nl-BE');
    expect(speechLanguage('nl', ['en-GB'])).toBe('nl-NL');
    expect(speechLanguage('nl', [])).toBe('nl-NL');
  });

  it('respells whole words, keeping a capital', () => {
    expect(respell('Common meter. Meters, not parameters.', 'british')).toBe('Common metre. Metres, not parameters.');
    expect(respell('common meter', 'american')).toBe('common meter');
  });

  it('respells the interface and the lessons, in English only', () => {
    const meter = (lessons: ReturnType<typeof getLessons>) => lessons.beatsMore.paragraphs.join(' ');
    expect(meter(getLessons('en', 'british'))).toMatch(/metre/);
    expect(meter(getLessons('en', 'british'))).not.toMatch(/meter/);
    expect(meter(getLessons('en', 'american'))).toMatch(/meter/);
    expect(i18nFor('nl', 'british').m).toEqual(i18nFor('nl', 'american').m);
  });
});
