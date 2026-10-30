import { createContext, useContext } from 'react';
import { detectLocale, getMessages, type Locale, type Messages } from './index';
import { respell, spellingFor, type Spelling } from './region';

export interface I18n {
  locale: Locale;
  m: Messages;
  /** How English is spelled: the phone's region decides. */
  spelling: Spelling;
}

export function i18nFor(locale: Locale, spelling: Spelling = spellingFor()): I18n {
  const messages = getMessages(locale);
  const m = locale === 'en' ? (Object.fromEntries(Object.entries(messages).map(([k, v]) => [k, respell(v, spelling)])) as Messages) : messages;
  return { locale, m, spelling };
}

export const I18nContext = createContext<I18n>(i18nFor(detectLocale()));

export function useI18n(): I18n {
  return useContext(I18nContext);
}
