import type { Page } from '@playwright/test';

// A stand-in for the browser's SpeechRecognition, for the specs that tap
// "Check this device" or "Say it". Not a spec file itself: Playwright only
// runs *.spec.ts.
//
// The real one is never asked in these tests: in Chromium 153 on touch
// devices (the phone and tablet projects), SpeechRecognition.available()
// crashes the tab, and this machine's headless Chromium has no speech pack.

/** What the page asked of the fake since it loaded (window.__recognition). */
export interface RecognitionLog {
  availableCalls: number;
  installCalls: number;
  /** How many recognition objects were made (`new SpeechRecognition()`). */
  constructed: number;
  /** processLocally at each start(), in order. */
  started: boolean[];
}

/** Which languages the page asked about and listened for (window.__recognitionLangs). */
export interface RecognitionLangs {
  /** The langs of each available() and install() call, in order. */
  asked: string[][];
  /** recognition.lang at each start(), in order. */
  started: string[];
}

type FakeWindow = Window & {
  __recognition: RecognitionLog;
  __recognitionLangs: RecognitionLangs;
  /** Sends a final result to the recognition listening now. */
  __hear: (text: string) => void;
};

/**
 * Replaces SpeechRecognition (both names, as in Chrome) on every page the
 * test opens. `availability` is what available({ processLocally: true })
 * says; install() says yes.
 */
export async function fakeSpeechRecognition(
  page: Page,
  availability: 'available' | 'downloadable' | 'downloading' | 'unavailable' = 'available',
): Promise<void> {
  await page.addInitScript((answer) => {
    type Handler<T> = ((event: T) => void) | null;
    const log: RecognitionLog = { availableCalls: 0, installCalls: 0, constructed: 0, started: [] };
    const made: FakeRecognition[] = [];
    const langs: RecognitionLangs = { asked: [], started: [] };

    class FakeRecognition {
      static available(options?: { langs?: string[] }) {
        langs.asked.push(options?.langs ?? []);
        log.availableCalls += 1;
        return Promise.resolve(answer);
      }
      static install(options?: { langs?: string[] }) {
        langs.asked.push(options?.langs ?? []);
        log.installCalls += 1;
        return Promise.resolve(true);
      }
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: Handler<unknown> = null;
      onerror: Handler<{ error: string }> = null;
      onend: (() => void) | null = null;
      private local = false;
      running = false;
      constructor() {
        log.constructed += 1;
        made.push(this);
      }
      // An accessor, so that 'processLocally' is on the prototype, as in Chrome.
      get processLocally() {
        return this.local;
      }
      set processLocally(value: boolean) {
        this.local = value;
      }
      start() {
        log.started.push(this.local);
        langs.started.push(this.lang);
        this.running = true;
      }
      stop() {
        setTimeout(() => this.finish(), 0);
      }
      abort() {
        this.finish();
      }
      finish() {
        if (!this.running) return;
        this.running = false;
        this.onend?.();
      }
    }

    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, name, { configurable: true, writable: true, value: FakeRecognition });
    }
    const w = window as unknown as FakeWindow;
    w.__recognition = log;
    w.__recognitionLangs = langs;
    w.__hear = (text) => {
      const result = Object.assign([{ transcript: text }], { isFinal: true });
      made.filter((recognition) => recognition.running).at(-1)?.onresult?.({ resultIndex: 0, results: [result] });
    };
  }, availability);
}

/** What the fake has been asked on the page open now. */
export function recognitionLog(page: Page): Promise<RecognitionLog> {
  return page.evaluate(() => ({ ...(window as unknown as FakeWindow).__recognition }));
}

/** The fake hears `text` (a final result) in the box listening now. */
export function hear(page: Page, text: string): Promise<void> {
  return page.evaluate((words) => (window as unknown as FakeWindow).__hear(words), text);
}

/** The languages the page asked about and listened for, on the page open now. */
export function recognitionLangs(page: Page): Promise<RecognitionLangs> {
  return page.evaluate(() => structuredClone((window as unknown as FakeWindow).__recognitionLangs));
}
