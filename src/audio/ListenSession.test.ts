import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeMedia } from '../test/mediaFake';
import { fakeVoice, mockSpeechSynthesis, restoreSpeechMocks } from '../test/speechMocks';
import type { LoadedRecording, LoadOptions } from './load';
import { ListenSession, WAIT_MS, type ListenPart } from './ListenSession';
import type { RecordingRef } from './recordings';
import type { PieceTime } from './timings';

const REF: RecordingRef = { lang: 'en', key: 'towns-near-rivers/standard/1', hash: 'abc' };
const ITEMS = [{ text: 'Rivers.', pauseAfterMs: 400 }, 'They flood.', 'Mud is fertile.'];
const TIMES: PieceTime[] = [
  [0.1, 0.8],
  [1.55, 2.6],
  [2.95, 4.2],
];
const PART: ListenPart = { items: ITEMS, recording: REF };

function recording(ref = REF): LoadedRecording {
  return { ref, times: TIMES, url: 'blob:rivers', release: vi.fn() };
}

interface Setup {
  voice?: boolean;
  load?: (ref: RecordingRef, options: LoadOptions) => Promise<LoadedRecording | null>;
  onlyStored?: boolean;
  rate?: number;
}

function setup({ voice = true, load = () => Promise.resolve(recording()), onlyStored = false, rate = 1 }: Setup = {}) {
  const speech = mockSpeechSynthesis();
  const media = new FakeMedia();
  const loader = vi.fn(load);
  const callbacks = { onItem: vi.fn(), onFinish: vi.fn(), onError: vi.fn(), onLoading: vi.fn(), onUnavailable: vi.fn() };
  const session = new ListenSession(
    {
      media: () => media,
      synth: speech.synth,
      voice: voice ? fakeVoice('en-GB') : null,
      rate,
      load: loader,
      onlyStored: () => onlyStored,
      silence: () => 'blob:silence',
    },
    callbacks,
  );
  return { speech, media, session, loader, ...callbacks };
}

/** Lets the recording's promise settle. */
const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  restoreSpeechMocks();
});

describe('ListenSession with a recording', () => {
  it('plays the recording, not the device voice, and marks each sentence from the clock', async () => {
    const { media, session, speech, onItem, onLoading } = setup();
    session.unlock();
    expect(media.played).toEqual(['blob:silence']);
    session.play(PART);
    expect(onLoading).toHaveBeenLastCalledWith(true);
    await settle();
    expect(onLoading).toHaveBeenLastCalledWith(false);
    expect(media.src).toBe('blob:rivers');
    expect(speech.spoken).toEqual([]);
    expect(onItem).toHaveBeenLastCalledWith(0);
    media.advanceTo(1.6);
    expect(onItem).toHaveBeenLastCalledWith(1);
  });

  it('switching Slow and Normal mid-sentence changes the speed, not the place or the highlight', async () => {
    const { media, session, onItem } = setup({ rate: 1 });
    session.play(PART);
    await settle();
    media.advanceTo(2.0);
    expect(onItem).toHaveBeenLastCalledWith(1);
    session.setRate(0.8);
    expect(media.playbackRate).toBe(0.8);
    expect(media.preservesPitch).toBe(true);
    expect(media.currentTime).toBe(2.0);
    expect(session.position).toBe(1);
    media.advanceTo(2.5);
    expect(onItem).toHaveBeenLastCalledWith(1);
    session.setRate(1);
    media.advanceTo(3.0);
    expect(onItem).toHaveBeenLastCalledWith(2);
    expect(media.playbackRate).toBe(1);
  });

  it('pauses, and plays the same sentence again from its start without downloading it again', async () => {
    const { media, session, loader } = setup();
    session.play(PART);
    await settle();
    media.advanceTo(2.0);
    session.pause();
    expect(media.paused).toBe(true);
    session.resume();
    expect(media.currentTime).toBe(1.55);
    expect(media.paused).toBe(false);
    // A new start of the same part reuses the recording it has.
    session.stop();
    session.play(PART);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('finishes the part when the recording ends', async () => {
    const { media, session, onFinish } = setup();
    session.play(PART);
    await settle();
    media.end();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

describe('ListenSession falling back to the device voice', () => {
  it('reads with the voice when the language has no recordings', () => {
    const { session, speech, loader } = setup();
    session.play({ items: ITEMS, recording: null });
    expect(loader).not.toHaveBeenCalled();
    expect(speech.spoken.map((u) => u.text)).toEqual(['Rivers.']);
  });

  it('reads with the voice when there is no recording to play (offline, or the text changed)', async () => {
    const { session, speech, media } = setup({ load: () => Promise.resolve(null) });
    session.play(PART, 1);
    await settle();
    expect(speech.spoken.map((u) => u.text)).toEqual(['They flood.']);
    expect(media.played).toEqual([]);
  });

  it('reads with the voice when the recording is slow to arrive, and never plays it late', async () => {
    let arrive: (value: LoadedRecording) => void = () => undefined;
    const { session, speech, media } = setup({ load: () => new Promise((resolve) => (arrive = resolve)) });
    session.play(PART);
    await vi.advanceTimersByTimeAsync(WAIT_MS);
    expect(speech.spoken.map((u) => u.text)).toEqual(['Rivers.']);
    const late = recording();
    arrive(late);
    await settle();
    expect(media.played).toEqual([]);
    expect(late.release).toHaveBeenCalled();
  });

  it('carries on with the voice from the same sentence when the recording breaks', async () => {
    const { session, speech, media } = setup();
    session.play(PART);
    await settle();
    media.advanceTo(3.0);
    media.fail();
    expect(speech.spoken.map((u) => u.text)).toEqual(['Mud is fertile.']);
  });

  it('with Save data, asks only for a recording already on the device', async () => {
    const { session, loader } = setup({ onlyStored: true });
    session.play(PART);
    await settle();
    expect(loader).toHaveBeenCalledWith(REF, { onlyStored: true });
  });

  it('with Save data and no voice, downloads the recording anyway', async () => {
    const { session, loader } = setup({ onlyStored: true, voice: false });
    session.play(PART);
    await settle();
    expect(loader).toHaveBeenCalledWith(REF, { onlyStored: false });
  });

  it('says so, and stops, with neither a recording nor a voice', async () => {
    const { session, onUnavailable, onItem } = setup({ voice: false, load: () => Promise.resolve(null) });
    session.play(PART);
    // No voice: it waits for the recording as long as it takes, then gives up.
    await vi.advanceTimersByTimeAsync(WAIT_MS * 2);
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(onItem).toHaveBeenLastCalledWith(null);
    expect(session.isPlaying).toBe(false);
  });

  it('a pause while waiting cancels what was coming', async () => {
    let arrive: (value: LoadedRecording) => void = () => undefined;
    const { session, media, onLoading } = setup({ load: () => new Promise((resolve) => (arrive = resolve)) });
    session.play(PART);
    session.pause();
    expect(onLoading).toHaveBeenLastCalledWith(false);
    arrive(recording());
    await settle();
    expect(media.played).toEqual([]);
  });
});
