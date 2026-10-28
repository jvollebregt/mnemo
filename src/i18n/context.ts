import { createContext, useContext } from 'react';
import { detectLocale, getMessages, type Locale, type Messages } from './index';

export interface I18n {
  locale: Locale;
  m: Messages;
}

export function i18nFor(locale: Locale): I18n {
  return { locale, m: getMessages(locale) };
}

export const I18nContext = createContext<I18n>(i18nFor(detectLocale()));

export function useI18n(): I18n {
  return useContext(I18nContext);
}
