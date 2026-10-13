import { describe, expect, it } from 'vitest';
import { createVideoTracker, playerInfo } from './youtube';

const frame = {} as Window;
const message = (data: unknown, over: { origin?: string; source?: unknown } = {}) =>
  ({ origin: 'https://www.youtube-nocookie.com', source: frame, data: typeof data === 'string' ? data : JSON.stringify(data), ...over }) as Pick<
    MessageEvent,
    'origin' | 'source' | 'data'
  >;

describe('playerInfo', () => {
  it('reads state changes and delivered information from the player in the lesson\'s own frame', () => {
    expect(playerInfo(message({ event: 'onStateChange', info: 1 }), frame)).toEqual({ state: 1, currentTime: null, duration: null });
    expect(playerInfo(message({ event: 'infoDelivery', info: { playerState: 1, currentTime: 12.5, duration: 100 } }), frame)).toEqual({
      state: 1,
      currentTime: 12.5,
      duration: 100,
    });
  });

  it('ignores other senders, other frames, other messages and rubbish', () => {
    expect(playerInfo(message({ event: 'onStateChange', info: 1 }, { origin: 'https://evil.example' }), frame)).toBeNull();
    expect(playerInfo(message({ event: 'onStateChange', info: 1 }, { source: {} }), frame)).toBeNull();
    expect(playerInfo(message({ event: 'onStateChange', info: 1 }), null)).toBeNull();
    expect(playerInfo(message({ event: 'onReady' }), frame)).toBeNull();
    expect(playerInfo(message('not json'), frame)).toBeNull();
    expect(playerInfo(message('null'), frame)).toBeNull();
    expect(playerInfo(message({ event: 'infoDelivery', info: { currentTime: 'soon', duration: Number.NaN } }), frame)).toEqual({
      state: null,
      currentTime: null,
      duration: null,
    });
  });
});

describe('createVideoTracker', () => {
  it('reports play once, each quarter once, and the end once', () => {
    const track = createVideoTracker();
    expect(track({ state: 1, currentTime: 0, duration: 100 })).toEqual(['play']);
    expect(track({ state: 1, currentTime: 10, duration: 100 })).toEqual([]);
    expect(track({ state: 1, currentTime: 26, duration: 100 })).toEqual([25]);
    expect(track({ state: 2, currentTime: 26, duration: 100 })).toEqual([]);
    expect(track({ state: 1, currentTime: 80, duration: null })).toEqual([50, 75]);
    expect(track({ state: 0, currentTime: null, duration: null })).toEqual([100]);
    // Watching again reports nothing new.
    expect(track({ state: 1, currentTime: 90, duration: 100 })).toEqual([]);
    expect(track({ state: 0, currentTime: null, duration: null })).toEqual([]);
  });

  it('reports no share of a video whose length it has not been told', () => {
    const track = createVideoTracker();
    expect(track({ state: 1, currentTime: 50, duration: null })).toEqual(['play']);
  });

  it('is separate for each video', () => {
    const first = createVideoTracker();
    const second = createVideoTracker();
    expect(first({ state: 1, currentTime: 0, duration: 10 })).toEqual(['play']);
    expect(second({ state: 1, currentTime: 0, duration: 10 })).toEqual(['play']);
  });
});
