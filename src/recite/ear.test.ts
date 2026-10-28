import { afterEach, describe, expect, it, vi } from 'vitest';
import { joinHeard, webEar } from './ear';

class FakeRecognition {
  static made: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  constructor() {
    FakeRecognition.made.push(this);
  }
  hear(...texts: string[]) {
    this.onresult?.({ results: texts.map((transcript) => [{ transcript }]) });
  }
}

describe('the ear', () => {
  afterEach(() => {
    FakeRecognition.made = [];
    delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it('is unavailable where the browser can\'t listen', () => {
    expect(webEar().available).toBe(false);
  });

  it('passes on everything heard so far, through the recogniser\'s own pauses, until stopped', () => {
    (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
    const heard = vi.fn();
    const stopped = vi.fn();
    const listening = webEar().listen('nl', heard, stopped);
    const first = FakeRecognition.made[0]!;
    expect(first.lang).toBe('nl-NL');
    first.hear('O krinklende', ' winklende');
    expect(heard).toHaveBeenLastCalledWith('O krinklende winklende');

    // After a silence the recogniser ends by itself; listening goes on.
    first.onend?.();
    const second = FakeRecognition.made[1]!;
    second.hear('waterding');
    expect(heard).toHaveBeenLastCalledWith('O krinklende winklende waterding');
    expect(stopped).not.toHaveBeenCalled();

    listening.stop();
    expect(stopped).toHaveBeenCalledWith(undefined);
  });

  it('stops for good when it may not listen', () => {
    (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
    const stopped = vi.fn();
    webEar().listen('en', () => {}, stopped);
    const recognition = FakeRecognition.made[0]!;
    recognition.onerror?.({ error: 'not-allowed' });
    recognition.onend?.();
    expect(stopped).toHaveBeenCalledWith('not-allowed');
    expect(FakeRecognition.made).toHaveLength(1);
  });

  it('joins pieces of speech with single spaces', () => {
    expect(joinHeard(' hope is ', '', 'the thing')).toBe('hope is the thing');
  });
});
