/**
 * Recording a recital, for readers who choose to keep their latest one. It
 * runs beside listening and never judges anything; it only keeps the sound,
 * compressed for voice (about 150 KB a minute).
 */

export interface Recorded {
  data: Uint8Array;
  type: string;
}

export interface Taking {
  /** Stops recording and hands over the sound, or nothing if none was taken. */
  stop(): Promise<Recorded | undefined>;
}

export interface Recorder {
  readonly available: boolean;
  /** Starts recording, or resolves to nothing when the microphone can't be had. */
  start(): Promise<Taking | undefined>;
}

const VOICE_BITS_PER_SECOND = 20_000;

export const noRecorder: Recorder = { available: false, start: async () => undefined };

export function webRecorder(): Recorder {
  const can =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  if (!can) return noRecorder;
  return {
    available: true,
    async start() {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return undefined;
      }
      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: VOICE_BITS_PER_SECOND });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.start();
      return {
        stop: () =>
          new Promise<Recorded | undefined>((resolve) => {
            recorder.onstop = async () => {
              stream.getTracks().forEach((track) => track.stop());
              const blob = new Blob(chunks, { type: recorder.mimeType });
              resolve(blob.size > 0 ? { data: new Uint8Array(await blob.arrayBuffer()), type: blob.type } : undefined);
            };
            if (recorder.state === 'inactive') recorder.onstop(new Event('stop'));
            else recorder.stop();
          }),
      };
    },
  };
}
