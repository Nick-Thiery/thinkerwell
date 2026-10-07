import type { Page } from '@playwright/test';

// A stand-in for the browser's speechSynthesis with a list of voices, for
// the specs that check Listen's voice. Not a spec file itself: Playwright
// only runs *.spec.ts. Headless Chromium has no voices of its own.
//
// Speaking does nothing but log what would be said, with which voice, and
// waits for `finish()` (window.__voices.finish) to end the current piece.

/** A voice as the browser lists it. */
export interface FakeVoice {
  name: string;
  lang: string;
  /** Default: on the device (localService). */
  local?: boolean;
  /** Default: the name, as Chrome has it (Safari's are Apple's identifiers). */
  uri?: string;
  isDefault?: boolean;
}

/** One utterance, as speak() got it. */
export interface Spoken {
  text: string;
  voice: string | null;
  lang: string;
  rate: number;
}

type FakeWindow = Window & {
  __voices: { spoken: Spoken[]; finish: () => void; cancels: number };
};

/**
 * An iPad's Safari, as far as a page can see (docs/notes/listen-voices.md):
 * every voice says it is the default, and novelty and Eloquence voices
 * come first. Plus one online voice, and Indonesian.
 */
export const IPAD_VOICES: FakeVoice[] = [
  { name: 'Albert', lang: 'en-US', uri: 'com.apple.speech.synthesis.voice.Albert', isDefault: true },
  { name: 'Eddy', lang: 'en-GB', uri: 'com.apple.eloquence.en-GB.Eddy', isDefault: true },
  { name: 'Bad News', lang: 'en-US', uri: 'com.apple.speech.synthesis.voice.BadNews', isDefault: true },
  { name: 'Samantha', lang: 'en-US', uri: 'com.apple.voice.compact.en-US.Samantha', isDefault: true },
  { name: 'Karen', lang: 'en-AU', uri: 'com.apple.voice.compact.en-AU.Karen', isDefault: true },
  { name: 'Daniel', lang: 'en-GB', uri: 'com.apple.voice.compact.en-GB.Daniel', isDefault: true },
  { name: 'Google UK English Female', lang: 'en-GB', local: false },
  { name: 'Damayanti', lang: 'id-ID', uri: 'com.apple.voice.compact.id-ID.Damayanti', isDefault: true },
];

/** sessionStorage key: a test can change the device's voices for the next page it opens (as another device would have). */
export const VOICES_KEY = 'e2e-voices';

/**
 * Replaces speechSynthesis with `voices` on every page the test opens. A
 * list saved under VOICES_KEY in sessionStorage replaces it from then on.
 */
export async function fakeVoices(page: Page, voices: FakeVoice[] = IPAD_VOICES): Promise<void> {
  await page.addInitScript(
    ({ given, key }) => {
      type Utterance = { text: string; voice?: { name: string } | null; lang?: string; rate?: number; onend?: (() => void) | null; onerror?: ((e: { error: string }) => void) | null };
      let list = given;
      try {
        const saved = sessionStorage.getItem(key);
        if (saved) list = JSON.parse(saved) as typeof given;
      } catch {
        // No sessionStorage: the given list.
      }
      const voices = list.map((each) => ({
        name: each.name,
        lang: each.lang,
        voiceURI: each.uri ?? each.name,
        localService: each.local ?? true,
        default: each.isDefault ?? false,
      }));
      let queue: Utterance[] = [];
      const log: FakeWindow['__voices'] = {
        spoken: [],
        cancels: 0,
        finish: () => queue.shift()?.onend?.(),
      };
      const events = new EventTarget();
      const synth = {
        paused: false,
        pending: false,
        get speaking() {
          return queue.length > 0;
        },
        getVoices: () => voices,
        speak(u: Utterance) {
          log.spoken.push({ text: u.text, voice: u.voice?.name ?? null, lang: u.lang ?? '', rate: u.rate ?? 1 });
          queue.push(u);
        },
        cancel() {
          log.cancels += 1;
          const dropped = queue;
          queue = [];
          dropped.forEach((u) => u.onerror?.({ error: 'interrupted' }));
        },
        pause() {},
        resume() {},
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
      };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: class {
          text: string;
          voice: unknown = null;
          lang = '';
          rate = 1;
          constructor(text: string) {
            this.text = text;
          }
        },
      });
      (window as unknown as FakeWindow).__voices = log;
    },
    { given: voices, key: VOICES_KEY },
  );
}

/** Everything spoken on this page so far. */
export function spoken(page: Page): Promise<Spoken[]> {
  return page.evaluate(() => (window as unknown as FakeWindow).__voices.spoken);
}

/** Ends the piece being spoken now. */
export function finishSpeaking(page: Page): Promise<void> {
  return page.evaluate(() => (window as unknown as FakeWindow).__voices.finish());
}

/** The device's voices from the next page on, as another device would list them. */
export function changeVoices(page: Page, voices: FakeVoice[]): Promise<void> {
  return page.evaluate(({ key, list }) => sessionStorage.setItem(key, JSON.stringify(list)), { key: VOICES_KEY, list: voices });
}
