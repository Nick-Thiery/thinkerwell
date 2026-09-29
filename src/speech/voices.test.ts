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
