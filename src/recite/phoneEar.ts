/**
 * Listening on the phone, through Mnemo's own small native plugin
 * (native/ear): the phone's on-device recognition, so nothing is sent away.
 * Where the phone can't recognise speech on the device, listening ends with
 * a problem and the reader types instead. On iPhone the same plugin can
 * record the recital from the same microphone.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { fromBase64 } from '../store/base64';
import { joinHeard, SPEECH_LANGUAGE, type Ear } from './ear';
import { noRecorder, type Recorder } from './recorder';

export interface MnemoEarPlugin {
  start(options: { language: string }): Promise<void>;
  stop(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<{ data?: string; type?: string }>;
  addListener(event: 'heard', listener: (event: { text: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'ended', listener: (event: { problem?: string }) => void): Promise<PluginListenerHandle>;
}

const MnemoEar = registerPlugin<MnemoEarPlugin>('MnemoEar');

/** A recogniser that keeps ending at once, hearing nothing, can't listen here. */
const EMPTY_STRETCHES = 3;
const EMPTY_MS = 1000;

export function phoneEar(plugin: MnemoEarPlugin = MnemoEar, clock: () => number = Date.now): Ear {
  return {
    available: true,
    listen(language, onHeard, onStop) {
      let stopped = false;
      let running = false;
      let ended = false;
      let before = '';
      let current = '';
      let began = 0;
      let empty = 0;

      const end = (problem?: string) => {
        if (ended) return;
        ended = true;
        void Promise.all(handles).then((all) => all.forEach((h) => void h.remove()));
        onStop(problem);
      };

      const start = () => {
        running = true;
        began = clock();
        plugin.start({ language: SPEECH_LANGUAGE[language] }).catch((error: unknown) => {
          running = false;
          end(error instanceof Error && error.message ? error.message : 'unavailable');
        });
      };

      const handles = [
        plugin.addListener('heard', ({ text }) => {
          current = text;
          onHeard(joinHeard(before, current));
        }),
        // A stretch of listening ends after a pause; carry on until the reader is done.
        plugin.addListener('ended', ({ problem }) => {
          running = false;
          empty = !current && clock() - began < EMPTY_MS ? empty + 1 : 0;
          before = joinHeard(before, current);
          current = '';
          if (problem) end(problem);
          else if (stopped) end();
          else if (empty >= EMPTY_STRETCHES) end('unavailable');
          else start();
        }),
      ];
      void Promise.all(handles).then(() => {
        if (!stopped) start();
      });

      return {
        stop() {
          stopped = true;
          if (running) void plugin.stop();
          else end();
        },
      };
    },
  };
}

/** Only the iPhone plugin can record beside listening; elsewhere recitals aren't kept yet. */
export function phoneRecorder(plugin: MnemoEarPlugin = MnemoEar, platform = Capacitor.getPlatform()): Recorder {
  if (platform !== 'ios') return noRecorder;
  return {
    available: true,
    async start() {
      try {
        await plugin.startRecording();
      } catch {
        return undefined;
      }
      return {
        async stop() {
          const { data, type } = await plugin.stopRecording();
          return data ? { data: fromBase64(data), type: type ?? 'audio/mp4' } : undefined;
        },
      };
    },
  };
}
