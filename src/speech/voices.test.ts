import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ListenVoiceChoice } from '../storage/types';
import { fakeVoice, mockSpeechSynthesis, restoreSpeechMocks } from '../test/speechMocks';
import { getSpeechSynthesis, isChosenVoice, pickListenVoice, useDeviceVoices, useListenVoice, voiceChoice } from './voices';

afterEach(() => restoreSpeechMocks());

describe('pickListenVoice', () => {
  it('never picks a voice that needs the internet', () => {
    expect(pickListenVoice([fakeVoice('en-US', { local: false, name: 'Google US English' })])).toBeNull();
    expect(pickListenVoice([])).toBeNull();
  });

  it('only picks English voices', () => {
    expect(pickListenVoice([fakeVoice('fr-FR'), fakeVoice('id-ID')])).toBeNull();
    expect(pickListenVoice([fakeVoice('fr-FR'), fakeVoice('en-IN')])?.lang).toBe('en-IN');
  });

  it("prefers British English, and the device's default only breaks ties", () => {
    const us = fakeVoice('en-US');
    const gb = fakeVoice('en-GB');
    const au = fakeVoice('en-AU', { isDefault: true });
    expect(pickListenVoice([us, gb, au])).toBe(gb);
    expect(pickListenVoice([us, au])).toBe(us);
    expect(pickListenVoice([fakeVoice('en-GB', { local: false }), us])).toBe(us);
    const gbDefault = fakeVoice('en-GB', { name: 'Second en-GB', isDefault: true });
    expect(pickListenVoice([us, gb, gbDefault])).toBe(gbDefault);
  });

  it('reads older Android language tags (en_GB)', () => {
    const voice = fakeVoice('en_GB');
    expect(pickListenVoice([fakeVoice('en-ZA'), voice])).toBe(voice);
  });
});

describe('the voice chosen in Settings', () => {
  const daniel = fakeVoice('en-GB', { name: 'Daniel (Enhanced)' });
  const karen = fakeVoice('en-AU', { name: 'Karen' });
  const eddy = fakeVoice('en-US', { name: 'Eddy (English (United States))' });

  it('wins over the ranking', () => {
    expect(pickListenVoice([daniel, karen, eddy])).toBe(daniel);
    expect(pickListenVoice([daniel, karen, eddy], 'en', voiceChoice(karen))).toBe(karen);
    // Even a voice the ranking puts last, when an educator chose it.
    expect(pickListenVoice([daniel, karen, eddy], 'en', voiceChoice(eddy))).toBe(eddy);
  });

  it("falls back to the best voice when the chosen one isn't on this device", () => {
    const gone = { name: 'Zoe (Premium)', voiceURI: 'Zoe (Premium)', lang: 'en-US' };
    expect(pickListenVoice([daniel, karen], 'en', gone)).toBe(daniel);
    // Nor when it is here but can't be used: online now, or in another language.
    const online = fakeVoice('en-US', { name: 'Karen', local: false });
    expect(pickListenVoice([daniel, online], 'en', voiceChoice(karen))).toBe(daniel);
    expect(pickListenVoice([daniel, karen], 'id-ID', voiceChoice(karen))).toBeNull();
  });

  it('is found again by its name and voiceURI', () => {
    expect(isChosenVoice(karen, voiceChoice(karen))).toBe(true);
    expect(isChosenVoice(karen, { ...voiceChoice(karen), voiceURI: 'other' })).toBe(false);
    expect(voiceChoice(karen)).toEqual({ name: 'Karen', voiceURI: 'Karen', lang: 'en-AU' });
  });
});

describe('useListenVoice', () => {
  it('is null without speechSynthesis', () => {
    expect(getSpeechSynthesis()).toBeNull();
    const { result } = renderHook(() => useListenVoice());
    expect(result.current).toBeNull();
  });

  it('picks up voices that arrive later', () => {
    const speech = mockSpeechSynthesis([]);
    const { result } = renderHook(() => useListenVoice());
    expect(result.current).toBeNull();
    const voice = fakeVoice('en-GB');
    act(() => speech.setVoices([fakeVoice('en-US', { local: false }), voice]));
    expect(result.current).toBe(voice);
    act(() => speech.setVoices([fakeVoice('en-US', { local: false })]));
    expect(result.current).toBeNull();
  });

  it('keeps the same voice object when the browser lists the same voices again, so reading never restarts', () => {
    const speech = mockSpeechSynthesis([fakeVoice('en-GB', { name: 'Daniel' })]);
    const { result } = renderHook(() => useListenVoice());
    const first = result.current;
    expect(first?.name).toBe('Daniel');
    // New objects with the same details, as some browsers give on every getVoices().
    act(() => speech.setVoices([fakeVoice('en-GB', { name: 'Daniel' }), fakeVoice('en-US', { name: 'Samantha' })]));
    expect(result.current).toBe(first);
  });

  it('uses the chosen voice, and the best one again when the choice is cleared', () => {
    const daniel = fakeVoice('en-GB', { name: 'Daniel' });
    const samantha = fakeVoice('en-US', { name: 'Samantha' });
    mockSpeechSynthesis([samantha, daniel]);
    const initialProps: { chosen: ListenVoiceChoice | null } = { chosen: voiceChoice(samantha) };
    const { result, rerender } = renderHook(({ chosen }) => useListenVoice('en', chosen), { initialProps });
    expect(result.current).toBe(samantha);
    rerender({ chosen: null });
    expect(result.current).toBe(daniel);
  });
});

describe('useDeviceVoices', () => {
  it('says the list is settled at once without speech, and after the last re-read with it', () => {
    expect(renderHook(() => useDeviceVoices()).result.current).toEqual({ voices: [], settled: true });
    vi.useFakeTimers();
    try {
      mockSpeechSynthesis([fakeVoice('en-GB')]);
      const { result } = renderHook(() => useDeviceVoices());
      expect(result.current.settled).toBe(false);
      expect(result.current.voices).toHaveLength(1);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.settled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Listen in the lesson’s language', () => {
  it('reads Indonesian lessons with an Indonesian voice on the device', () => {
    const voices = [fakeVoice('en-GB', { isDefault: true }), fakeVoice('id-ID', { name: 'Damayanti' })];
    expect(pickListenVoice(voices, 'id-ID')?.name).toBe('Damayanti');
    expect(pickListenVoice(voices)?.lang).toBe('en-GB');
  });

  it('never reads Indonesian with an English voice, or with one that runs online', () => {
    expect(pickListenVoice([fakeVoice('en-GB', { isDefault: true }), fakeVoice('en-US')], 'id-ID')).toBeNull();
    expect(pickListenVoice([fakeVoice('id-ID', { local: false })], 'id-ID')).toBeNull();
  });

  it('knows Indonesian by its old code and with an underscore', () => {
    expect(pickListenVoice([fakeVoice('in_ID', { name: 'Old Android' })], 'id-ID')?.name).toBe('Old Android');
  });

  it('follows a change of language', () => {
    mockSpeechSynthesis([fakeVoice('en-GB'), fakeVoice('id-ID')]);
    const { result, rerender } = renderHook(({ lang }) => useListenVoice(lang), { initialProps: { lang: 'en' } });
    expect(result.current?.lang).toBe('en-GB');
    rerender({ lang: 'id-ID' });
    expect(result.current?.lang).toBe('id-ID');
  });
});
