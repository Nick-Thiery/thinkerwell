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

/** dictationMode() with the device settings it reads. */
const mode = (onDeviceConfirmed: boolean, allowOnline: boolean) => dictationMode({ onDeviceConfirmed, allowOnline });

describe('dictationMode', () => {
  it('is null where the browser has no speech recognition (Firefox, Samsung Internet)', () => {
    expect(hasSpeechRecognition()).toBe(false);
    for (const confirmed of [false, true]) {
      expect(mode(confirmed, false)).toBeNull();
      expect(mode(confirmed, true)).toBeNull();
    }
    expect(createRecognition('online')).toBeNull();
  });

  it('uses the device once an educator confirmed it there (Chrome on a laptop), without asking the browser', () => {
    const mock = mockSpeechRecognition({ availability: 'available' });
    expect(mode(true, false)).toBe('on-device');
    expect(mode(true, true)).toBe('on-device');
    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.instances).toHaveLength(0);
  });

  it('is null until an educator confirmed the device, unless online is allowed', () => {
    const mock = mockSpeechRecognition({ availability: 'available' });
    expect(mode(false, false)).toBeNull();
    expect(mode(false, true)).toBe('online');
    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.instances).toHaveLength(0);
  });

  it('only goes online with the setting on where nothing can stay on the device (Safari, Chrome on Android)', () => {
    // A saved "available" from another browser can't make an engine without processLocally stay on the device.
    mockSpeechRecognition({ onDevice: false });
    expect(mode(true, false)).toBeNull();
    expect(mode(true, true)).toBe('online');
    restoreSpeechMocks();

    mockSpeechRecognition({ prefixedOnly: true });
    expect(mode(false, false)).toBeNull();
    expect(mode(true, false)).toBeNull();
    expect(mode(false, true)).toBe('online');
  });
});

describe('onDeviceDictationStatus (Check this device)', () => {
  it('asks the browser about English dictation on the device', async () => {
    for (const availability of ['available', 'downloadable', 'downloading', 'unavailable'] as const) {
      const mock = mockSpeechRecognition({ availability });
      expect(await onDeviceDictationStatus()).toBe(availability);
      expect(mock.available).toHaveBeenCalledWith({ langs: [DICTATION_LANG], processLocally: true, quality: 'dictation' });
      expect(mock.instances).toHaveLength(0);
      restoreSpeechMocks();
    }
  });

  it('is unsupported where the browser has no on-device option', async () => {
    expect(await onDeviceDictationStatus()).toBe('unsupported');
    mockSpeechRecognition({ onDevice: false });
    expect(await onDeviceDictationStatus()).toBe('unsupported');
    restoreSpeechMocks();
    mockSpeechRecognition({ prefixedOnly: true });
    expect(await onDeviceDictationStatus()).toBe('unsupported');
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
