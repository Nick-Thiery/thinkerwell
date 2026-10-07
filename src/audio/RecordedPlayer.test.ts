import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeMedia } from '../test/mediaFake';
import type { LoadedRecording } from './load';
import { RecordedPlayer, TRACK_MS } from './RecordedPlayer';
import type { PieceTime } from './timings';

const TIMES: PieceTime[] = [
  [0.1, 1.2],
  [1.95, 4.0],
  [4.35, 6.1],
];

function recording(times: PieceTime[] = TIMES): LoadedRecording {
  return { ref: { lang: 'en', key: 'l/standard/1', hash: 'h' }, times, url: 'blob:part-1', release: vi.fn() };
}

function setup(rate = 1) {
  const media = new FakeMedia();
  const onItem = vi.fn<(index: number | null) => void>();
  const onFinish = vi.fn();
  const onError = vi.fn();
  const player = new RecordedPlayer(media, rate, { onItem, onFinish, onError });
  return { media, player, onItem, onFinish, onError };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('RecordedPlayer', () => {
  it('plays the recording from the first piece and marks each piece as the clock reaches it', async () => {
    const { media, player, onItem } = setup();
    player.play(recording());
    await Promise.resolve();
    expect(media.src).toBe('blob:part-1');
    expect(media.played).toEqual(['blob:part-1']);
    expect(media.currentTime).toBe(0.1);
    expect(onItem).toHaveBeenLastCalledWith(0);

    media.advanceTo(2.5);
    expect(onItem).toHaveBeenLastCalledWith(1);
    // Also checked between timeupdates, so the highlight never lags far behind.
    media.currentTime = 4.5;
    vi.advanceTimersByTime(TRACK_MS);
    expect(onItem).toHaveBeenLastCalledWith(2);
    expect(onItem.mock.calls.map(([index]) => index)).toEqual([0, 1, 2]);
  });

  it('plays Slow at 0.8 with the pitch kept, and switching speed mid-sentence keeps the place and the highlight', () => {
    const { media, player, onItem } = setup(0.8);
    player.play(recording());
    expect(media.playbackRate).toBe(0.8);
    expect(media.defaultPlaybackRate).toBe(0.8);
    expect(media.preservesPitch).toBe(true);
    expect(media.webkitPreservesPitch).toBe(true);
    expect(media.mozPreservesPitch).toBe(true);

    media.advanceTo(3.1);
    expect(onItem).toHaveBeenLastCalledWith(1);
    const calls = onItem.mock.calls.length;
    player.setRate(1);
    expect(media.playbackRate).toBe(1);
    expect(media.currentTime).toBe(3.1);
    expect(media.paused).toBe(false);
    expect(media.played).toHaveLength(1);
    vi.advanceTimersByTime(TRACK_MS);
    expect(onItem.mock.calls.length).toBe(calls);
    media.advanceTo(4.4);
    expect(onItem).toHaveBeenLastCalledWith(2);
  });

  it('pauses where it is, and Play starts the same piece again from its beginning', () => {
    const { media, player, onItem } = setup();
    player.play(recording());
    media.advanceTo(3.2);
    player.pause();
    expect(media.paused).toBe(true);
    expect(player.position).toBe(1);
    // The clock moving while paused (a late timeupdate) changes nothing.
    media.advanceTo(5);
    expect(onItem).toHaveBeenLastCalledWith(1);

    player.resume();
    expect(media.currentTime).toBe(1.95);
    expect(media.paused).toBe(false);
  });

  it('starts from a later piece, waiting for the recording’s length before seeking', () => {
    const { media, player } = setup();
    media.readyState = 0;
    player.play(recording(), 2);
    expect(media.played).toEqual([]);
    media.readyState = 1;
    media.emit('loadedmetadata');
    expect(media.currentTime).toBe(4.35);
    expect(media.played).toEqual(['blob:part-1']);
  });

  it('finishes at the end of the recording, and reports a broken file', () => {
    const { media, player, onFinish, onError } = setup();
    player.play(recording());
    media.end();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(player.isPlaying).toBe(false);

    player.play(recording());
    media.fail();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('reports a refused play(), but not one it interrupted itself', async () => {
    const { media, player, onError } = setup();
    media.playFails = 'AbortError';
    player.play(recording());
    await vi.waitFor(() => expect(onError).not.toHaveBeenCalled());
    media.playFails = 'NotAllowedError';
    player.play(recording());
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it('stops and lets go of the element', () => {
    const { media, player, onItem } = setup();
    player.play(recording());
    player.stop();
    expect(onItem).toHaveBeenLastCalledWith(null);
    player.dispose();
    media.advanceTo(3);
    media.end();
    expect(onItem).toHaveBeenLastCalledWith(null);
  });
});
