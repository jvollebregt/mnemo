/** The languages a poem can be written in. Separate from the interface language. */
export type PoemLanguage = 'en' | 'nl';

export const poemLanguages: readonly PoemLanguage[] = ['en', 'nl'];

export function isPoemLanguage(value: string): value is PoemLanguage {
  return (poemLanguages as readonly string[]).includes(value);
}
