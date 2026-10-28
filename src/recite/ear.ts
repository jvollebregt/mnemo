/**
 * Listening to a recital. The page only needs the words heard so far, as one
 * running text; it lines them up with the poem itself. In the browser this
 * is the Web Speech API. On the phone it is the phone's own on-device
 * recognition (phoneEar.ts), behind the same interface.
 */
import type { PoemLanguage } from '../poem/language';

export interface Listening {
  stop(): void;
}

export interface Ear {
  /** Whether this device can listen at all. */
  readonly available: boolean;
  /**
   * Starts listening. `onHeard` gets everything heard so far, each time it
   * grows; `onStop` is called once when listening ends, with a reason when
   * it ended by itself (no microphone, or permission refused).
   */
  listen(language: PoemLanguage, onHeard: (text: string) => void, onStop: (problem?: string) => void): Listening;
}

/** The recogniser's language for a poem's language. */
export const SPEECH_LANGUAGE: Record<PoemLanguage, string> = { en: 'en-GB', nl: 'nl-NL' };

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
        recognition.lang = SPEECH_LANGUAGE[language];
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
