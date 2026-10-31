/**
 * Listening to a recital. The page only needs the words heard so far, as one
 * running text; it lines them up with the poem itself. In the browser this
 * is the Web Speech API. On the phone it is the phone's own on-device
 * recognition (phoneEar.ts), behind the same interface.
 */
import type { PoemLanguage } from '../poem/language';
import { speechLanguage } from '../i18n/region';

export interface Listening {
  stop(): void;
}

export interface Ear {
  /** Whether this device can listen at all. */
  readonly available: boolean;
  /**
   * Starts listening. `onHeard` gets everything heard so far, each time it
   * grows; `onStop` is called once when listening ends, with a reason when
   * it ended by itself (no microphone, or permission refused). `expect` are
   * the words of the lines being recited, which a phone that can be told
   * what to listen for hears better: a rare word like "bestial" over a
   * common one like "Bastille".
   */
  listen(
    language: PoemLanguage,
    onHeard: (text: string) => void,
    onStop: (problem?: string) => void,
    expect?: readonly string[],
  ): Listening;
}


/** Problems that mean listening can't work here, as opposed to a pause in speech. */
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported']);

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** The most a recogniser is told to listen for; past this, Apple says it helps less. */
export const MOST_EXPECTED = 100;

/**
 * The words worth telling a recogniser to expect: each once, the longest
 * (and so rarest) first, since common short words are heard well anyway.
 */
export function expected(words: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const word of words) {
    const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (bare && !seen.has(bare.toLowerCase())) seen.set(bare.toLowerCase(), bare);
  }
  return [...seen.values()].sort((a, b) => b.length - a.length).slice(0, MOST_EXPECTED);
}

/** Joins what was heard before a restart with what is heard after it. */
export const joinHeard = (...parts: readonly string[]) => parts.join(' ').replace(/\s+/g, ' ').trim();

export function webEar(): Ear {
  const Recognition = recognitionConstructor();
  return {
    available: !!Recognition,
    listen(language, onHeard, onStop) {
      if (!Recognition) {
        onStop('unavailable');
        return { stop() {} };
      }
      let stopped = false;
      let before = '';
      let current = '';
      let problem: string | undefined;
      let recognition: Recognition;

      const start = () => {
        recognition = new Recognition();
        recognition.lang = speechLanguage(language);
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          current = joinHeard(...Array.from(event.results, (result) => result[0]?.transcript ?? ''));
          onHeard(joinHeard(before, current));
        };
        recognition.onerror = (event) => {
          if (FATAL.has(event.error)) problem = event.error;
        };
        // A recogniser stops by itself after a silence; carry on until the reader is done.
        recognition.onend = () => {
          if (!stopped && !problem) {
            before = joinHeard(before, current);
            current = '';
            start();
            return;
          }
          onStop(problem);
        };
        recognition.start();
      };
      start();
      return {
        stop() {
          stopped = true;
          recognition.stop();
        },
      };
    },
  };
}
