/**
 * Speech recognition for "Say it" (dictation), and how to tell whether it
 * can run on the device. See docs/notes/phase-5.md for browser support.
 *
 * - On the device: the Web Speech API's `SpeechRecognition.available()`
 *   with `processLocally: true` says whether this browser can turn speech
 *   into text without sending audio anywhere (Chrome and Edge 139+ on
 *   desktop, once the language pack is on the device). Recognition then
 *   runs with `processLocally = true`, which the spec says MUST stay on the
 *   device.
 * - Online: every other SpeechRecognition (Chrome on Android, Safari,
 *   Chrome without the language pack, Edge's default) may send the
 *   learner's voice to the browser maker's service. For children that is
 *   off unless an educator turns on "Allow online speech-to-text"
 *   (settings.partner.allowOnlineDictation).
 * - Neither: Say it is hidden.
 *
 * Only an educator's tap asks the browser (`onDeviceDictationStatus()`, from
 * "Check this device" in Settings, which saves the answer in
 * settings.speechCheck). Lessons decide from that saved answer with
 * `dictationMode()`, which calls nothing, and make a recognition object only
 * when the learner taps Say it: in Chromium 153 on touch devices, calling
 * `available()` as a page opened crashed the tab.
 *
 * TypeScript's DOM library has no SpeechRecognition yet, so the small part
 * used here is typed below.
 */

/**
 * The language Say it listens for by default. The course is in English;
 * en-US is the language pack browsers ship first. When a learner's lessons
 * are in Indonesian it listens for id-ID instead (speechLangFor in
 * ./language.ts), under exactly the same on-device rules.
 */
export const DICTATION_LANG = 'en-US';

/** What Say it needs from a recognition engine: long, continuous speech from one person. */
const DICTATION_QUALITY = 'dictation';

/** How long to wait for the browser to say whether on-device recognition is ready. */
const AVAILABILITY_TIMEOUT_MS = 3000;

export interface RecognitionAlternativeLike {
  transcript: string;
}

export interface RecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternativeLike;
}

export interface RecognitionResultListLike {
  readonly length: number;
  [index: number]: RecognitionResultLike;
}

export interface RecognitionResultEventLike {
  readonly resultIndex: number;
  readonly results: RecognitionResultListLike;
}

export interface RecognitionErrorEventLike {
  /** 'no-speech', 'aborted', 'audio-capture', 'network', 'not-allowed', 'service-not-allowed', 'language-not-supported', ... */
  readonly error: string;
}

/** The part of a SpeechRecognition instance Say it uses. */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type AvailabilityStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';

interface RecognitionOptions {
  langs: string[];
  processLocally?: boolean;
  quality?: string;
}

export interface RecognitionConstructor {
  new (): RecognitionLike;
  prototype: object;
  available?: (options: RecognitionOptions) => Promise<AvailabilityStatus>;
  install?: (options: RecognitionOptions) => Promise<boolean>;
}

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function speechWindow(): SpeechWindow | null {
  return typeof window === 'undefined' ? null : window;
}

/** The unprefixed SpeechRecognition, the only one that can be told to stay on the device. */
function unprefixed(): RecognitionConstructor | null {
  return speechWindow()?.SpeechRecognition ?? null;
}

/** Any SpeechRecognition the browser has (Safari and older Chrome only have the webkit one). */
function anyRecognition(): RecognitionConstructor | null {
  const w = speechWindow();
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null;
}

/** True when this browser has some kind of speech recognition. */
export function hasSpeechRecognition(): boolean {
  return anyRecognition() !== null;
}

/**
 * True when the browser can be asked to keep recognition on the device: an
 * unprefixed SpeechRecognition with `available()` and a real
 * `processLocally` property. (Setting processLocally on an engine that
 * doesn't know it would do nothing, and the audio could go online.)
 */
function supportsOnDevice(ctor: RecognitionConstructor | null): ctor is RecognitionConstructor {
  return !!ctor && typeof ctor.available === 'function' && 'processLocally' in ctor.prototype;
}

function localOptions(lang: string): RecognitionOptions {
  return { langs: [lang], processLocally: true, quality: DICTATION_QUALITY };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/**
 * Whether speech in `lang` (English unless given) can be turned into text
 * on this device:
 * - 'available': yes, now;
 * - 'downloadable' / 'downloading': after the browser downloads a language
 *   pack (an educator can start that from Settings);
 * - 'unavailable': this browser can't on this device;
 * - 'unsupported': this browser has no on-device option at all.
 *
 * Only from an educator's tap in Settings ("Check this device"), never as a
 * page opens: see the note at the top of this file.
 */
export async function onDeviceDictationStatus(lang: string = DICTATION_LANG): Promise<AvailabilityStatus | 'unsupported'> {
  const ctor = unprefixed();
  if (!supportsOnDevice(ctor)) return 'unsupported';
  try {
    return await withTimeout(ctor.available!(localOptions(lang)), AVAILABILITY_TIMEOUT_MS, 'unavailable');
  } catch {
    return 'unavailable';
  }
}

/**
 * Asks the browser to download what it needs to turn speech in `lang`
 * (English unless given) into text on the device. Only from a tap on the
 * Settings page (for educators): the download can be large. Resolves true
 * once it is ready.
 */
export async function installOnDeviceDictation(lang: string = DICTATION_LANG): Promise<boolean> {
  const ctor = unprefixed();
  if (!supportsOnDevice(ctor) || typeof ctor.install !== 'function') return false;
  try {
    return await ctor.install(localOptions(lang));
  } catch {
    return false;
  }
}

/** How Say it turns speech into text here: on the device, or with an online service the educator allowed. */
export type DictationMode = 'on-device' | 'online';

/** What the device settings say about Say it. */
export interface DictationSettings {
  /** An educator's "Check this device" found on-device recognition available (settings.speechCheck). */
  onDeviceConfirmed: boolean;
  /** "Allow online speech-to-text" is on (settings.partner.allowOnlineDictation). */
  allowOnline: boolean;
}

/**
 * The way Say it can work on this device, or null when it can't (the button
 * is hidden). It reads the saved settings and whether the browser has the
 * API, and asks the browser nothing: no available(), no recognition object.
 */
export function dictationMode({ onDeviceConfirmed, allowOnline }: DictationSettings): DictationMode | null {
  if (onDeviceConfirmed && supportsOnDevice(unprefixed())) return 'on-device';
  if (allowOnline && hasSpeechRecognition()) return 'online';
  return null;
}

/**
 * A recognition object set up for dictation, or null if it can't be made.
 * 'on-device' sets processLocally = true, so the browser must not send the
 * audio anywhere (it fails with an error instead). Only when the learner
 * taps Say it.
 */
export function createRecognition(mode: DictationMode, lang: string = DICTATION_LANG): RecognitionLike | null {
  const ctor = mode === 'on-device' ? unprefixed() : anyRecognition();
  if (!ctor || (mode === 'on-device' && !supportsOnDevice(ctor))) return null;
  try {
    const recognition = new ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    if (mode === 'on-device') recognition.processLocally = true;
    return recognition;
  } catch {
    return null;
  }
}
