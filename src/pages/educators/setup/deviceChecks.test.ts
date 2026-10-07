import { describe, expect, it, vi } from 'vitest';
import {
  askToPersist,
  detectPlatform,
  learnersStepState,
  offlineStepState,
  readPersistence,
  speechFinding,
  speechStepState,
  storageStepState,
  voiceStepState,
} from './deviceChecks';

const UA = {
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  ipadOld: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  chromebook: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

describe('detectPlatform', () => {
  it('knows iPads (which ask for the desktop site), iPhones, Android and laptops', () => {
    expect(detectPlatform(UA.ipad, 5)).toBe('apple');
    expect(detectPlatform(UA.ipadOld, 5)).toBe('apple');
    expect(detectPlatform(UA.iphone, 5)).toBe('apple');
    expect(detectPlatform(UA.android, 5)).toBe('android');
    expect(detectPlatform(UA.windowsEdge, 0)).toBe('desktop');
    expect(detectPlatform(UA.windowsEdge, 10)).toBe('desktop');
    expect(detectPlatform(UA.chromebook, 0)).toBe('desktop');
  });

  it('gives a Mac without a touch screen the laptop steps', () => {
    expect(detectPlatform(UA.mac, 0)).toBe('desktop');
  });
});

describe('persistent storage', () => {
  it('reads whether storage is persistent without asking for it', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    expect(await readPersistence({ persisted: () => Promise.resolve(true), persist })).toBe('persisted');
    expect(await readPersistence({ persisted: () => Promise.resolve(false), persist })).toBe('not-persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('says so where the browser has no storage manager, or it fails', async () => {
    expect(await readPersistence(undefined)).toBe('unsupported');
    expect(await readPersistence({})).toBe('unsupported');
    expect(await readPersistence({ persisted: () => Promise.reject(new Error('no')), persist: () => Promise.resolve(true) })).toBe(
      'unsupported',
    );
  });

  it('asks with persist(), and reports a no', async () => {
    expect(await askToPersist({ persist: () => Promise.resolve(true) })).toBe('persisted');
    expect(await askToPersist({ persist: () => Promise.resolve(false) })).toBe('refused');
    expect(await askToPersist({ persist: () => Promise.reject(new Error('no')) })).toBe('refused');
    expect(await askToPersist({})).toBe('unsupported');
  });

  it('turns into a step state', () => {
    expect(storageStepState('persisted', true)).toBe('done');
    expect(storageStepState('not-persisted', true)).toBe('todo');
    expect(storageStepState('refused', true)).toBe('todo');
    expect(storageStepState('unknown', true)).toBe('checking');
    expect(storageStepState('asking', true)).toBe('checking');
    expect(storageStepState('unsupported', true)).toBe('not-here');
    // No storage at all (a private window): nothing to keep.
    expect(storageStepState('persisted', false)).toBe('not-here');
  });
});

describe('step states', () => {
  it('follows the course download as Settings reports it', () => {
    expect(offlineStepState('ready')).toBe('done');
    expect(offlineStepState('preparing')).toBe('in-progress');
    expect(offlineStepState('checking')).toBe('checking');
    expect(offlineStepState('failed')).toBe('todo');
    expect(offlineStepState('unsupported')).toBe('not-here');
  });

  it('counts learners as done once there is one', () => {
    expect(learnersStepState(0, true)).toBe('todo');
    expect(learnersStepState(1, true)).toBe('done');
    expect(learnersStepState(12, true)).toBe('done');
    expect(learnersStepState(0, false)).toBe('not-here');
  });

  it('reads speech to text from the saved check alone', () => {
    const at = '2026-09-28T09:00:00.000Z';
    expect(speechFinding(null, false)).toBe('none');
    expect(speechFinding({ status: 'available', checkedAt: at }, false)).toBe('none');
    expect(speechFinding(null, true)).toBe('not-checked');
    expect(speechFinding({ status: 'available', checkedAt: at }, true)).toBe('on-device');
    expect(speechFinding({ status: 'downloadable', checkedAt: at }, true)).toBe('download');
    expect(speechFinding({ status: 'downloading', checkedAt: at }, true)).toBe('download');
    expect(speechFinding({ status: 'unavailable', checkedAt: at }, true)).toBe('not-on-device');
    expect(speechFinding({ status: 'unsupported', checkedAt: at }, true)).toBe('not-on-device');

    expect(speechStepState('none')).toBe('not-needed');
    expect(speechStepState('not-checked')).toBe('todo');
    expect(speechStepState('download')).toBe('in-progress');
    // Checked is done, whatever the answer: lessons now know what to do.
    expect(speechStepState('on-device')).toBe('done');
    expect(speechStepState('not-on-device')).toBe('done');
  });
});

describe('the Listen voice step', () => {
  it('is done once a voice is chosen, optional while Listen picks one, and not here without a voice', () => {
    const voice = { name: 'Daniel' };
    expect(voiceStepState({ voice, chosen: true, settled: true })).toBe('done');
    expect(voiceStepState({ voice, chosen: false, settled: false })).toBe('optional');
    expect(voiceStepState({ voice: null, chosen: false, settled: false })).toBe('checking');
    expect(voiceStepState({ voice: null, chosen: false, settled: true })).toBe('not-here');
  });
});
