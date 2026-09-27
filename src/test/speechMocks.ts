/**
 * Fakes for the browser speech and media APIs (jsdom has none of them), for
 * Vitest. Each install function stubs the globals it needs; call
 * `restoreSpeechMocks()` in afterEach.
 *
 *   const speech = mockSpeechSynthesis([localVoice('en-GB')]);
 *   ... speech.spoken[0].text ... speech.finish() ...
 */
import { vi } from 'vitest';

type Listener = () => void;

/* ------------------------------------------------------------ synthesis */

export class FakeUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onend: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(text = '') {
    this.text = text;
  }
}

export function fakeVoice(lang: string, { local = true, name, isDefault = false }: { local?: boolean; name?: string; isDefault?: boolean } = {}): SpeechSynthesisVoice {
  const voiceName = name ?? `${local ? 'Local' : 'Online'} ${lang}`;
  return { lang, localService: local, name: voiceName, voiceURI: voiceName, default: isDefault };
}

export interface SpeechSynthesisMock {
  synth: SpeechSynthesis;
  /** Every utterance passed to speak(), in order. */
  spoken: FakeUtterance[];
  /** The utterance being spoken now (first in the queue), if any. */
  current: () => FakeUtterance | undefined;
  /** Ends the current utterance normally. */
  finish: () => void;
  /** Fails the current utterance (not a cancel). */
  fail: (error?: string) => void;
  /** Replaces the voice list and fires voiceschanged. */
  setVoices: (voices: SpeechSynthesisVoice[]) => void;
  cancel: ReturnType<typeof vi.fn>;
}

export function mockSpeechSynthesis(initialVoices: SpeechSynthesisVoice[] = [fakeVoice('en-GB')]): SpeechSynthesisMock {
  let voices = initialVoices;
  let queue: FakeUtterance[] = [];
  const spoken: FakeUtterance[] = [];
  const listeners = new Set<Listener>();
  const cancel = vi.fn(() => {
    const dropped = queue;
    queue = [];
    // Real browsers report a cancelled utterance as an 'interrupted' or 'canceled' error.
    dropped.forEach((u) => u.onerror?.({ error: 'interrupted' }));
  });
  const synth = {
    paused: false,
    pending: false,
    get speaking() {
      return queue.length > 0;
    },
    getVoices: () => voices,
    speak: vi.fn((utterance: FakeUtterance) => {
      spoken.push(utterance);
      queue.push(utterance);
    }),
    cancel,
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  } as unknown as SpeechSynthesis;
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return {
    synth,
    spoken,
    current: () => queue[0],
    finish: () => {
      const utterance = queue.shift();
      utterance?.onend?.({});
    },
    fail: (error = 'synthesis-failed') => {
      const utterance = queue.shift();
      utterance?.onerror?.({ error });
    },
    setVoices: (next) => {
      voices = next;
      listeners.forEach((listener) => listener());
    },
    cancel,
  };
}

/* ---------------------------------------------------------- recognition */

type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface FakeRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  /** Sends results: each piece is [transcript, isFinal]. The list is cumulative, as in Chrome. */
  hear: (pieces: Array<[string, boolean]>) => void;
  fail: (error: string) => void;
  end: () => void;
}

export interface RecognitionMock {
  instances: FakeRecognitionInstance[];
  latest: () => FakeRecognitionInstance;
  /** Called each time a recognition object is made (`new SpeechRecognition()`), under either name. */
  construct: ReturnType<typeof vi.fn>;
  available: ReturnType<typeof vi.fn>;
  install: ReturnType<typeof vi.fn>;
}

/**
 * Stubs SpeechRecognition.
 * - `onDevice`: the unprefixed constructor has available()/install() and a
 *   processLocally property (Chrome 139+ on desktop). Otherwise it is an
 *   engine that can only go online (Safari, Chrome on Android).
 * - `availability`: what available({ processLocally: true }) says.
 * - `prefixedOnly`: only webkitSpeechRecognition exists (Safari).
 * - `prefixedToo`: webkitSpeechRecognition is the same constructor, as in Chrome.
 *
 * Pages must not call `available` or `construct` as they open (only on a
 * tap): Chromium 153 crashed the tab on touch devices when they did.
 */
export function mockSpeechRecognition({
  onDevice = true,
  availability = 'available',
  prefixedOnly = false,
  prefixedToo = false,
  installResult = true,
}: {
  onDevice?: boolean;
  availability?: Availability;
  prefixedOnly?: boolean;
  prefixedToo?: boolean;
  installResult?: boolean;
} = {}): RecognitionMock {
  const instances: FakeRecognitionInstance[] = [];
  const construct = vi.fn();
  const available = vi.fn(() => Promise.resolve(availability));
  const install = vi.fn(() => Promise.resolve(installResult));

  class Base {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    running = false;
    start = vi.fn(() => {
      this.running = true;
    });
    stop = vi.fn(() => {
      queueMicrotask(() => this.end());
    });
    abort = vi.fn(() => {
      this.end();
    });
    constructor() {
      construct();
      instances.push(this as unknown as FakeRecognitionInstance);
    }
    hear(pieces: Array<[string, boolean]>) {
      const results = pieces.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal }));
      this.onresult?.({ resultIndex: 0, results });
    }
    fail(error: string) {
      this.onerror?.({ error });
      this.end();
    }
    end() {
      if (!this.running) return;
      this.running = false;
      this.onend?.();
    }
  }

  class OnDevice extends Base {
    static available = available;
    static install = install;
    private local = false;
    get processLocally() {
      return this.local;
    }
    set processLocally(value: boolean) {
      this.local = value;
    }
  }

  const ctor = onDevice ? OnDevice : Base;
  if (prefixedOnly) {
    vi.stubGlobal('webkitSpeechRecognition', Base);
  } else {
    vi.stubGlobal('SpeechRecognition', ctor);
    if (prefixedToo) vi.stubGlobal('webkitSpeechRecognition', ctor);
  }
  return { instances, latest: () => instances[instances.length - 1]!, construct, available, install };
}

/* -------------------------------------------------------------- recorder */

export interface MediaMock {
  getUserMedia: ReturnType<typeof vi.fn>;
  enumerateDevices: ReturnType<typeof vi.fn>;
  trackStop: ReturnType<typeof vi.fn>;
  recorders: Array<{ state: string; mimeType: string; stop: () => void }>;
}

/**
 * Stubs navigator.mediaDevices and MediaRecorder.
 * - `devices`: what enumerateDevices() lists (default: one microphone).
 * - `getUserMediaError`: a DOMException name to reject getUserMedia with.
 */
export function mockMediaRecorder({
  devices = [{ kind: 'audioinput' }],
  getUserMediaError,
  supportedTypes = ['audio/webm;codecs=opus', 'audio/webm'],
}: {
  devices?: Array<{ kind: string }>;
  getUserMediaError?: string;
  supportedTypes?: string[];
} = {}): MediaMock {
  const trackStop = vi.fn();
  const stream = { getTracks: () => [{ stop: trackStop }] };
  const getUserMedia = vi.fn(() =>
    getUserMediaError ? Promise.reject(new DOMException('No', getUserMediaError)) : Promise.resolve(stream),
  );
  const enumerateDevices = vi.fn(() => Promise.resolve(devices));
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });

  const recorders: MediaMock['recorders'] = [];
  class FakeMediaRecorder {
    static isTypeSupported = (type: string) => supportedTypes.includes(type);
    state = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(_stream: unknown, options: { mimeType?: string } = {}) {
      this.mimeType = options.mimeType ?? 'audio/webm';
      recorders.push(this);
    }
    start() {
      this.state = 'recording';
    }
    stop() {
      if (this.state === 'inactive') return;
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['clip'], { type: this.mimeType }) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  return { getUserMedia, enumerateDevices, trackStop, recorders };
}

/** Stubs URL.createObjectURL / revokeObjectURL and HTMLMediaElement.play for "Listen back". */
export function mockAudioPlayback(): {
  play: ReturnType<typeof vi.fn>;
  createObjectURL: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
} {
  let n = 0;
  const createObjectURL = vi.fn(() => `blob:clip-${(n += 1)}`);
  const revokeObjectURL = vi.fn();
  const urls = URL as unknown as Record<string, unknown>;
  const saved = { create: urls.createObjectURL, revoke: urls.revokeObjectURL };
  urls.createObjectURL = createObjectURL;
  urls.revokeObjectURL = revokeObjectURL;
  cleanups.push(() => {
    urls.createObjectURL = saved.create;
    urls.revokeObjectURL = saved.revoke;
  });
  const play = vi.fn(() => Promise.resolve());
  const media = HTMLMediaElement.prototype as unknown as Record<string, unknown>;
  const savedMedia = { play: media.play, pause: media.pause };
  media.play = play;
  media.pause = vi.fn();
  cleanups.push(() => {
    media.play = savedMedia.play;
    media.pause = savedMedia.pause;
  });
  return { play, createObjectURL, revokeObjectURL };
}

const cleanups: Array<() => void> = [];

/** Undoes every mock above. */
export function restoreSpeechMocks(): void {
  vi.unstubAllGlobals();
  if (Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')?.configurable) {
    delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  }
  while (cleanups.length > 0) cleanups.pop()?.();
}
