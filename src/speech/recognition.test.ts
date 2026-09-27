import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockSpeechRecognition, restoreSpeechMocks } from '../test/speechMocks';
import {
  createRecognition,
  DICTATION_LANG,
  dictationMode,
  hasSpeechRecognition,
  installOnDeviceDictation,
  onDeviceDictationStatus,
} from './recognition';

afterEach(() => restoreSpeechMocks());

describe('dictationMode', () => {
  it('is null where the browser has no speech recognition (Firefox, Samsung Internet)', async () => {
    expect(hasSpeechRecognition()).toBe(false);
    expect(await dictationMode(false)).toBeNull();
    expect(await dictationMode(true)).toBeNull();
    expect(createRecognition('online')).toBeNull();
  });

  it('uses the device when English recognition is ready there (Chrome and Edge on desktop)', async () => {
    const mock = mockSpeechRecognition({ availability: 'available' });
    expect(await dictationMode(false)).toBe('on-device');
    expect(await dictationMode(true)).toBe('on-device');
    expect(mock.available).toHaveBeenCalledWith({ langs: [DICTATION_LANG], processLocally: true, quality: 'dictation' });
  });

  it('is null until the language pack is on the device, unless online is allowed', async () => {
    for (const availability of ['downloadable', 'downloading', 'unavailable'] as const) {
      mockSpeechRecognition({ availability });
      expect(await dictationMode(false)).toBeNull();
      expect(await dictationMode(true)).toBe('online');
      restoreSpeechMocks();
    }
  });

  it('only goes online with the setting on where nothing can stay on the device (Safari, Chrome on Android)', async () => {
    mockSpeechRecognition({ onDevice: false });
    expect(await onDeviceDictationStatus()).toBe('unsupported');
    expect(await dictationMode(false)).toBeNull();
    expect(await dictationMode(true)).toBe('online');
    restoreSpeechMocks();

    mockSpeechRecognition({ prefixedOnly: true });
    expect(await dictationMode(false)).toBeNull();
    expect(await dictationMode(true)).toBe('online');
  });

  it("treats a browser that never answers as not on the device (Brave's 'downloading' forever)", async () => {
    vi.useFakeTimers();
    try {
      const mock = mockSpeechRecognition();
      mock.available.mockReturnValue(new Promise<never>(() => undefined));
      const status = onDeviceDictationStatus();
      await vi.advanceTimersByTimeAsync(3000);
      expect(await status).toBe('unavailable');
    } finally {
      vi.useRealTimers();
    }
  });

  it('treats a failing check as unavailable', async () => {
    const mock = mockSpeechRecognition();
    mock.available.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    expect(await onDeviceDictationStatus()).toBe('unavailable');
  });
});

describe('createRecognition', () => {
  it('sets processLocally for on-device, and English dictation settings', () => {
    const mock = mockSpeechRecognition();
    const recognition = createRecognition('on-device');
    expect(recognition).not.toBeNull();
    const made = mock.latest();
    expect(made.processLocally).toBe(true);
    expect(made.lang).toBe(DICTATION_LANG);
    expect(made.continuous).toBe(true);
    expect(made.interimResults).toBe(true);
  });

  it('leaves processLocally off for the online path', () => {
    const mock = mockSpeechRecognition();
    createRecognition('online');
    expect(mock.latest().processLocally).toBe(false);
  });

  it('refuses on-device where the engine has no processLocally', () => {
    mockSpeechRecognition({ onDevice: false });
    expect(createRecognition('on-device')).toBeNull();
    expect(createRecognition('online')).not.toBeNull();
  });
});

describe('installOnDeviceDictation', () => {
  it('asks the browser for the English language pack', async () => {
    const mock = mockSpeechRecognition({ availability: 'downloadable' });
    expect(await installOnDeviceDictation()).toBe(true);
    expect(mock.install).toHaveBeenCalledWith({ langs: [DICTATION_LANG], processLocally: true, quality: 'dictation' });
  });

  it('is false where there is nothing to install', async () => {
    expect(await installOnDeviceDictation()).toBe(false);
    mockSpeechRecognition({ onDevice: false });
    expect(await installOnDeviceDictation()).toBe(false);
    restoreSpeechMocks();
    const mock = mockSpeechRecognition({ availability: 'downloadable' });
    mock.install.mockRejectedValue(new Error('no'));
    expect(await installOnDeviceDictation()).toBe(false);
  });
});
