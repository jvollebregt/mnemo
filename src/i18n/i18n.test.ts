import { describe, expect, it } from 'vitest';
import { en } from './en';
import { nl } from './nl';
import { detectLocale, getMessages, locales } from './index';

describe('i18n', () => {
  it('has the same keys in every language', () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(nl).sort()).toEqual(keys);
    for (const locale of locales) {
      expect(Object.keys(getMessages(locale)).sort()).toEqual(keys);
    }
  });

  it('has no empty strings', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(getMessages(locale))) {
        expect(value.trim(), `${locale}.${key}`).not.toBe('');
      }
    }
  });

  it('picks Dutch for Dutch and Flemish devices, English otherwise', () => {
    expect(detectLocale(['nl-NL'])).toBe('nl');
    expect(detectLocale(['nl-BE', 'en-GB'])).toBe('nl');
    expect(detectLocale(['fr-FR', 'en-US'])).toBe('en');
    expect(detectLocale(['de-DE'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});
