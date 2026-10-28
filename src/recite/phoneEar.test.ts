import type { PluginListenerHandle } from '@capacitor/core';
import { describe, expect, it, vi } from 'vitest';
import { phoneEar, phoneRecorder, type MnemoEarPlugin } from './phoneEar';

/** A stand-in for the native plugin: the test says what is heard and when a stretch ends. */
function fakePlugin(refuse?: string) {
  const listeners: Record<string, ((event: never) => void)[]> = { heard: [], ended: [] };
  const plugin = {
    starts: [] as string[],
    stops: 0,
    start: vi.fn(async ({ language }: { language: string }) => {
      if (refuse) throw new Error(refuse);
      plugin.starts.push(language);
    }),
    stop: vi.fn(async () => {
      plugin.stops += 1;
    }),
    startRecording: vi.fn(async () => {}),
    stopRecording: vi.fn(async () => ({ data: btoa('\x01\x02'), type: 'audio/mp4' })),
    addListener: vi.fn(async (event: string, listener: (event: never) => void) => {
      listeners[event]!.push(listener);
      return { remove: async () => void listeners[event]!.splice(listeners[event]!.indexOf(listener), 1) } as PluginListenerHandle;
    }),
    hear: (text: string) => listeners.heard!.forEach((l) => l({ text } as never)),
    end: (problem?: string) => listeners.ended!.forEach((l) => l({ problem } as never)),
  };
  return plugin;
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('listening on the phone', () => {
  it('listens on through pauses, carrying what was heard, until the reader is done', async () => {
    const plugin = fakePlugin();
    let now = 0;
    const heard: string[] = [];
    const onStop = vi.fn();
    const listening = phoneEar(plugin as unknown as MnemoEarPlugin, () => now).listen('nl', (t) => heard.push(t), onStop);
    await settle();
    expect(plugin.starts).toEqual(['nl-NL']);
    plugin.hear('o krinklende');
    now = 5000;
    plugin.end();
    expect(plugin.starts).toHaveLength(2);
    plugin.hear('winklende waterding');
    expect(heard.at(-1)).toBe('o krinklende winklende waterding');

    listening.stop();
    expect(plugin.stops).toBe(1);
    plugin.end();
    expect(onStop).toHaveBeenCalledWith(undefined);
    expect(plugin.starts).toHaveLength(2);
  });

  it('stops with the problem when the phone can’t listen', async () => {
    const plugin = fakePlugin('unavailable');
    const onStop = vi.fn();
    phoneEar(plugin as unknown as MnemoEarPlugin).listen('en', () => {}, onStop);
    await settle();
    await settle();
    expect(onStop).toHaveBeenCalledWith('unavailable');
  });

  it('gives up when the recogniser keeps ending at once, hearing nothing', async () => {
    const plugin = fakePlugin();
    const onStop = vi.fn();
    phoneEar(plugin as unknown as MnemoEarPlugin, () => 0).listen('en', () => {}, onStop);
    await settle();
    plugin.end();
    plugin.end();
    expect(onStop).not.toHaveBeenCalled();
    plugin.end();
    expect(onStop).toHaveBeenCalledWith('unavailable');
  });

  it('ends at once when stopped between stretches', async () => {
    const plugin = fakePlugin();
    const onStop = vi.fn();
    const listening = phoneEar(plugin as unknown as MnemoEarPlugin).listen('en', () => {}, onStop);
    listening.stop();
    await settle();
    expect(onStop).toHaveBeenCalledWith(undefined);
    expect(plugin.starts).toEqual([]);
  });
});

describe('recording on the phone', () => {
  it('records on iPhone, handing the sound back as bytes', async () => {
    const plugin = fakePlugin();
    const recorder = phoneRecorder(plugin as unknown as MnemoEarPlugin, 'ios');
    expect(recorder.available).toBe(true);
    const take = await recorder.start();
    expect(await take!.stop()).toEqual({ data: new Uint8Array([1, 2]), type: 'audio/mp4' });
  });

  it('keeps no recordings on Android yet', () => {
    expect(phoneRecorder(fakePlugin() as unknown as MnemoEarPlugin, 'android').available).toBe(false);
  });
});
