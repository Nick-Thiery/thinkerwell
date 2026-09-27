import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeVoice, mockSpeechSynthesis, restoreSpeechMocks } from '../test/speechMocks';
import { getSpeechSynthesis, pickListenVoice, useListenVoice } from './voices';

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

  it("prefers the device's default English voice, then British English", () => {
    const us = fakeVoice('en-US');
    const gb = fakeVoice('en-GB');
    const au = fakeVoice('en-AU', { isDefault: true });
    expect(pickListenVoice([us, gb, au])).toBe(au);
    expect(pickListenVoice([us, gb])).toBe(gb);
    expect(pickListenVoice([fakeVoice('en-GB', { local: false }), us])).toBe(us);
  });

  it('reads older Android language tags (en_GB)', () => {
    const voice = fakeVoice('en_GB');
    expect(pickListenVoice([fakeVoice('en-ZA'), voice])).toBe(voice);
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
});
