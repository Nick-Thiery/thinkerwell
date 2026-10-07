/**
 * Choosing the voice for Listen (CLAUDE.md, "Listen, Say it and Record").
 *
 * Listen uses the browser's speechSynthesis with a voice that runs on the
 * device (`voice.localService === true`), so it works offline and nothing
 * the learner reads is sent anywhere. Network voices (Chrome's "Google US
 * English", Edge's "... Online (Natural)") are never used.
 *
 * It reads in the lesson's language: English, or Indonesian (id-ID) when a
 * learner's lessons are in Indonesian. A text is never read with another
 * language's voice (an English voice reading Indonesian can't be
 * understood). With no local voice for English, Listen is hidden; for
 * Indonesian, the Read step says so instead (src/pages/lesson/read/ReadStage.tsx).
 *
 * Which voice: the one an educator chose in Settings ("Listen voice"), if
 * it is still on the device; otherwise the best one, by the ranking in
 * ./voiceRanking.ts (docs/notes/listen-voices.md). Reading the voice list
 * (getVoices) asks the browser for nothing and never prompts.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ListenVoiceChoice } from '../storage/types';
import { rankListenVoices } from './voiceRanking';

/** The page's speechSynthesis, or null where the browser has none. */
export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  const synth = (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  return synth && typeof synth.speak === 'function' ? synth : null;
}

/**
 * The voices Listen may use for the lesson language `speechLang` ("en",
 * "id-ID"), best first: on the device, in that language, never a novelty
 * voice. Settings offers exactly these.
 */
export function listenVoices(voices: readonly SpeechSynthesisVoice[], speechLang = 'en'): SpeechSynthesisVoice[] {
  return rankListenVoices(voices, speechLang);
}

/** True when `voice` is the one an educator chose (`choice`). */
export function isChosenVoice(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI'>, choice: ListenVoiceChoice): boolean {
  return voice.voiceURI === choice.voiceURI && voice.name === choice.name;
}

/** What to save for `voice` when an educator chooses it. */
export function voiceChoice(voice: Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>): ListenVoiceChoice {
  return { name: voice.name, voiceURI: voice.voiceURI, lang: voice.lang };
}

/**
 * The voice Listen reads with in the lesson's language (`speechLang`,
 * English unless given): the educator's choice (`chosen`) when it is still
 * among this device's usable voices, otherwise the best usable voice.
 * A choice that has gone (another device, a voice removed) falls back to
 * the best voice without a word. null when there is no usable voice.
 */
export function pickListenVoice(
  voices: readonly SpeechSynthesisVoice[],
  speechLang = 'en',
  chosen?: ListenVoiceChoice | null,
): SpeechSynthesisVoice | null {
  const usable = listenVoices(voices, speechLang);
  if (chosen) {
    const match = usable.find((voice) => isChosenVoice(voice, chosen));
    if (match) return match;
  }
  return usable[0] ?? null;
}

/**
 * Some browsers fill in their voice list a moment after the page loads and
 * say so with `voiceschanged`; Safari on iOS sometimes doesn't fire it, so
 * the list is also read again a few times.
 */
const RECHECK_MS = [250, 1000, 3000];

function sameVoice(a: SpeechSynthesisVoice, b: SpeechSynthesisVoice): boolean {
  return a.voiceURI === b.voiceURI && a.name === b.name && a.lang === b.lang && a.localService === b.localService && a.default === b.default;
}

/**
 * The browser's list again, keeping the voice objects (and the list itself)
 * that haven't changed, so a voice in use stays the same object and
 * reading doesn't restart when the browser lists its voices again.
 */
function keepSame(current: readonly SpeechSynthesisVoice[], next: readonly SpeechSynthesisVoice[]): readonly SpeechSynthesisVoice[] {
  const merged = next.map((voice) => current.find((old) => sameVoice(old, voice)) ?? voice);
  return merged.length === current.length && merged.every((voice, index) => voice === current[index]) ? current : merged;
}

function readVoices(synth: SpeechSynthesis): readonly SpeechSynthesisVoice[] {
  try {
    return synth.getVoices();
  } catch {
    return [];
  }
}

const NO_VOICES: readonly SpeechSynthesisVoice[] = [];

/**
 * Every voice the browser lists (none without speechSynthesis), updated as
 * the list changes, and whether the browser has had time to list them
 * (after its last re-read, or at once without speech), so a page can say
 * "no voice" without flashing it while the list fills in.
 */
export function useDeviceVoices(): { voices: readonly SpeechSynthesisVoice[]; settled: boolean } {
  const [settled, setSettled] = useState(() => getSpeechSynthesis() === null);
  const [voices, setVoices] = useState<readonly SpeechSynthesisVoice[]>(() => {
    const synth = getSpeechSynthesis();
    return synth ? readVoices(synth) : NO_VOICES;
  });

  useEffect(() => {
    const synth = getSpeechSynthesis();
    if (!synth) return undefined;
    const refresh = () => setVoices((current) => keepSame(current, readVoices(synth)));
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    const timers = RECHECK_MS.map((ms, index) =>
      setTimeout(() => {
        refresh();
        if (index === RECHECK_MS.length - 1) setSettled(true);
      }, ms),
    );
    return () => {
      synth.removeEventListener('voiceschanged', refresh);
      timers.forEach(clearTimeout);
    };
  }, []);

  return { voices, settled };
}

/**
 * The local voice for Listen in the lesson's language (`speechLang`,
 * English unless given), or null (none yet, or none at all). `chosen` is
 * the educator's choice from Settings for that language. Updates when the
 * browser's voice list changes.
 */
export function useListenVoice(speechLang = 'en', chosen?: ListenVoiceChoice | null): SpeechSynthesisVoice | null {
  return useListenVoiceState(speechLang, chosen).voice;
}

/** The voice (as useListenVoice), and whether the browser has had time to list its voices (useDeviceVoices). */
export function useListenVoiceState(
  speechLang = 'en',
  chosen?: ListenVoiceChoice | null,
): { voice: SpeechSynthesisVoice | null; settled: boolean } {
  const { voices, settled } = useDeviceVoices();
  // The same voice object while the choice stays the same (keepSame), so nothing restarts.
  const voice = useMemo(() => pickListenVoice(voices, speechLang, chosen), [voices, speechLang, chosen]);
  return { voice, settled };
}
