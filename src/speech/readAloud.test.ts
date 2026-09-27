import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeVoice, mockSpeechSynthesis, restoreSpeechMocks } from '../test/speechMocks';
import { LISTEN_RATES, ReadAloudPlayer } from './readAloud';

afterEach(() => restoreSpeechMocks());

function setup() {
  const speech = mockSpeechSynthesis();
  const voice = fakeVoice('en-GB');
  const onItem = vi.fn();
  const onFinish = vi.fn();
  const onError = vi.fn();
  const player = new ReadAloudPlayer(speech.synth, voice, LISTEN_RATES.normal, { onItem, onFinish, onError });
  return { speech, voice, player, onItem, onFinish, onError };
}

describe('ReadAloudPlayer', () => {
  it('reads one piece at a time with the chosen voice, then finishes', () => {
    const { speech, voice, player, onItem, onFinish } = setup();
    player.play(['Rivers.', 'They flood.', 'Mud is fertile.']);
    expect(speech.spoken.map((u) => u.text)).toEqual(['Rivers.']);
    expect(speech.spoken[0]!.voice).toBe(voice);
    expect(speech.spoken[0]!.lang).toBe('en-GB');
    expect(onItem).toHaveBeenLastCalledWith(0);

    speech.finish();
    expect(onItem).toHaveBeenLastCalledWith(1);
    speech.finish();
    speech.finish();
    expect(speech.spoken.map((u) => u.text)).toEqual(['Rivers.', 'They flood.', 'Mud is fertile.']);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(player.isPlaying).toBe(false);
  });

  it('skips empty pieces', () => {
    const { speech, player, onItem } = setup();
    player.play(['', '  ', 'Hello.']);
    expect(speech.spoken.map((u) => u.text)).toEqual(['Hello.']);
    expect(onItem).toHaveBeenLastCalledWith(2);
  });

  it('pauses by cancelling, and plays the same piece again from its start', () => {
    const { speech, player, onFinish } = setup();
    player.play(['One.', 'Two.', 'Three.']);
    speech.finish();
    player.pause();
    expect(speech.cancel).toHaveBeenCalled();
    expect(player.isPlaying).toBe(false);
    expect(player.position).toBe(1);
    // The cancelled utterance's error event is ignored: nothing moves on.
    expect(speech.spoken).toHaveLength(2);
    expect(onFinish).not.toHaveBeenCalled();

    player.resume();
    expect(speech.spoken.map((u) => u.text)).toEqual(['One.', 'Two.', 'Two.']);
  });

  it('restarts the current piece at the new speed', () => {
    const { speech, player } = setup();
    player.play(['One.', 'Two.']);
    player.setRate(LISTEN_RATES.slow);
    expect(speech.spoken.map((u) => [u.text, u.rate])).toEqual([
      ['One.', 1],
      ['One.', 0.8],
    ]);
    // An old utterance ending late doesn't move the new one on.
    speech.spoken[0]!.onend?.({});
    expect(speech.spoken).toHaveLength(2);
  });

  it('stops quietly when the voice fails', () => {
    const { speech, player, onItem, onError, onFinish } = setup();
    player.play(['One.', 'Two.']);
    speech.fail('synthesis-failed');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onItem).toHaveBeenLastCalledWith(null);
    expect(onFinish).not.toHaveBeenCalled();
    expect(player.isPlaying).toBe(false);
  });

  it('stop() cancels and forgets the place', () => {
    const { speech, player, onItem } = setup();
    player.play(['One.', 'Two.']);
    speech.finish();
    player.stop();
    expect(onItem).toHaveBeenLastCalledWith(null);
    expect(player.position).toBe(0);
  });

  it('load() moves to new pieces without speaking', () => {
    const { speech, player } = setup();
    player.play(['One.', 'Two.']);
    player.load(['Uno.', 'Dos.']);
    expect(speech.spoken).toHaveLength(1);
    player.resume();
    expect(speech.spoken.map((u) => u.text)).toEqual(['One.', 'Uno.']);
  });
});
