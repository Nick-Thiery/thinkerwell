/**
 * What the "Set up this device" page (/educators/setup) can find out about
 * this device, and how each step's status is worked out. Everything here is
 * safe to run as the page opens: it reads what the browser already knows
 * (the service worker's state, whether storage is persistent, the display
 * mode, the user agent, the saved "Check this device" result) and asks the
 * browser for nothing that could prompt, download or crash.
 *
 * In particular nothing here touches SpeechRecognition: asking it as a page
 * opened crashed the tab in Chromium 153 on touch devices
 * (src/speech/recognition.ts). The speech step reads settings.speechCheck,
 * which only Settings' "Check this device" writes.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { OfflineStatus } from '../../../offline';
import type { SpeechCheck } from '../../../storage';

/** How a step stands on this device. */
export type StepState = 'done' | 'in-progress' | 'checking' | 'todo' | 'not-here' | 'not-needed';

// ------------------------------------------------------------------ offline

/** The course download (Settings, "Offline and data") as a step. */
export function offlineStepState(status: OfflineStatus): StepState {
  switch (status) {
    case 'ready':
      return 'done';
    case 'preparing':
      return 'in-progress';
    case 'checking':
      return 'checking';
    case 'failed':
      return 'todo';
    case 'unsupported':
      return 'not-here';
  }
}

// ----------------------------------------------------------- saved work safe

/**
 * Whether the browser keeps this site's storage even when space runs low:
 * - 'unknown' until persisted() answers;
 * - 'persisted' or 'not-persisted';
 * - 'asking' while persist() (from a tap) is waiting;
 * - 'refused' when persist() said no;
 * - 'unsupported' where the browser can't be asked.
 */
export type Persistence = 'unknown' | 'persisted' | 'not-persisted' | 'asking' | 'refused' | 'unsupported';

/** The parts of navigator.storage used here (a fake in tests). */
export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

function storageManager(): StorageManagerLike | undefined {
  // Missing on plain http and in some old browsers, whatever the DOM types say.
  const storage: StorageManagerLike | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage;
  return storage;
}

/** Asks only whether storage is already persistent (persisted() never prompts). */
export async function readPersistence(storage: StorageManagerLike | undefined = storageManager()): Promise<Persistence> {
  if (typeof storage?.persisted !== 'function' || typeof storage.persist !== 'function') return 'unsupported';
  try {
    return (await storage.persisted()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

/** Asks the browser to keep this site's storage (persist() may show a prompt, so only from a tap). */
export async function askToPersist(storage: StorageManagerLike | undefined = storageManager()): Promise<Persistence> {
  if (typeof storage?.persist !== 'function') return 'unsupported';
  try {
    return (await storage.persist()) ? 'persisted' : 'refused';
  } catch {
    return 'refused';
  }
}

export function storageStepState(persistence: Persistence, storageAvailable: boolean): StepState {
  if (!storageAvailable) return 'not-here';
  switch (persistence) {
    case 'persisted':
      return 'done';
    case 'unknown':
    case 'asking':
      return 'checking';
    case 'not-persisted':
    case 'refused':
      return 'todo';
    case 'unsupported':
      return 'not-here';
  }
}

/** Whether storage is persistent on this device, and "Keep work safe" (persist() on a tap). */
export function usePersistence(): { persistence: Persistence; ask: () => Promise<void> } {
  const [persistence, setPersistence] = useState<Persistence>('unknown');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void readPersistence().then((answer) => {
      if (alive.current) setPersistence((now) => (now === 'unknown' ? answer : now));
    });
    return () => {
      alive.current = false;
    };
  }, []);
  const ask = useCallback(async () => {
    setPersistence('asking');
    const answer = await askToPersist();
    if (alive.current) setPersistence(answer);
  }, []);
  return { persistence, ask };
}

// -------------------------------------------------------------- home screen

/** The kinds of device the pilot uses, for "Add Thinkerwell to the home screen". */
export type DevicePlatform = 'apple' | 'android' | 'desktop';

export const DEVICE_PLATFORMS: readonly DevicePlatform[] = ['apple', 'android', 'desktop'];

/**
 * A good guess at the kind of device, from the user agent. iPads ask for the
 * desktop site, so an iPad says "Macintosh"; unlike a Mac, it has a touch
 * screen. Anything that isn't an iPad, iPhone or Android device gets the
 * laptop steps (Chrome or Edge).
 */
export function detectPlatform(userAgent: string, maxTouchPoints: number): DevicePlatform {
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'apple';
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'apple';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

export function thisPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  return detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

/** Opened from the home screen (or as an installed app), not in a browser tab. */
const INSTALLED_QUERY = '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)';

function installedQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(INSTALLED_QUERY);
  } catch {
    return null;
  }
}

/** True when Thinkerwell is running as an installed app: the display mode, or Safari's own navigator.standalone. */
export function isInstalledApp(): boolean {
  const standalone = typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || installedQuery()?.matches === true;
}

function subscribeInstalled(onChange: () => void): () => void {
  const query = installedQuery();
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/** Whether Thinkerwell is running as an installed app now, updating if that changes. */
export function useInstalledApp(): boolean {
  return useSyncExternalStore(subscribeInstalled, isInstalledApp, () => false);
}

// ---------------------------------------------------------------- learners

export function learnersStepState(count: number, storageAvailable: boolean): StepState {
  if (!storageAvailable) return 'not-here';
  return count > 0 ? 'done' : 'todo';
}

// ------------------------------------------------------------ speech to text

/**
 * What the last "Check this device" (Settings) found, as a step:
 * - 'none': this browser has no speech recognition at all, so there is
 *   nothing to check (Settings shows no button either);
 * - 'not-checked': nobody has run the check on this device;
 * - 'on-device': speech to text works on the device;
 * - 'download': it works after the browser's one-time download;
 * - 'not-on-device': it can't work on the device (Say it stays hidden).
 */
export type SpeechFinding = 'none' | 'not-checked' | 'on-device' | 'download' | 'not-on-device';

export function speechFinding(check: SpeechCheck | null, hasRecognition: boolean): SpeechFinding {
  if (!hasRecognition) return 'none';
  if (!check) return 'not-checked';
  if (check.status === 'available') return 'on-device';
  if (check.status === 'downloadable' || check.status === 'downloading') return 'download';
  return 'not-on-device';
}

export function speechStepState(finding: SpeechFinding): StepState {
  switch (finding) {
    case 'none':
      return 'not-needed';
    case 'not-checked':
      return 'todo';
    case 'download':
      return 'in-progress';
    case 'on-device':
    case 'not-on-device':
      return 'done';
  }
}
