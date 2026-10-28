import { en } from './en';
import { nl } from './nl';

/** Interface languages. A poem's own language is stored separately, per poem. */
export type Locale = 'en' | 'nl';

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const catalogs: Record<Locale, Messages> = { en, nl };

export const locales = Object.keys(catalogs) as Locale[];

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

/** Picks the interface language from the device, falling back to English. */
export function detectLocale(languages: readonly string[] = navigator.languages ?? []): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'nl') return 'nl';
    if (base === 'en') return 'en';
  }
  return 'en';
}
