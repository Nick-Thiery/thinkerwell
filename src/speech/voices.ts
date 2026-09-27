/**
 * Choosing the voice for Listen (CLAUDE.md, "Listen, Say it and Record").
 *
 * Listen uses the browser's speechSynthesis with a voice that runs on the
 * device (`voice.localService === true`), so it works offline and nothing
 * the learner reads is sent anywhere. Network voices (Chrome's "Google US
 * English", Edge's "... Online (Natural)") are never used. If the device has
 * no local English voice, Listen is hidden.
 */
import { useEffect, useState } from 'react';

/** The page's speechSynthesis, or null where the browser has none. */
export function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  const synth = (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  return synth && typeof synth.speak === 'function' ? synth : null;
}

/** "en_US" (older Android) → "en-us". */
function normalLang(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase();
}

function isEnglish(voice: SpeechSynthesisVoice): boolean {
  const lang = normalLang(voice.lang);
  return lang === 'en' || lang.startsWith('en-');
}

/** Regional English voices in order of preference after the device's own default. */
const PREFERRED_LANGS = ['en-gb', 'en-us', 'en-au', 'en-ie', 'en-ca', 'en-nz', 'en-za', 'en-in'];

/**
 * The voice Listen reads with: an English voice that runs on the device.
 * The device's default voice wins if it qualifies (the learner or the
 * school may have chosen it); then British English (the course is written
 * in British spelling), then other English voices. null when there is none.
 */
export function pickListenVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const local = voices.filter((voice) => voice.localService && isEnglish(voice));
  if (local.length === 0) return null;
  const preferredDefault = local.find((voice) => voice.default);
  if (preferredDefault) return preferredDefault;
  for (const lang of PREFERRED_LANGS) {
    const match = local.find((voice) => normalLang(voice.lang) === lang);
    if (match) return match;
  }
  return local[0] ?? null;
}

/**
 * Some browsers fill in their voice list a moment after the page loads and
 * say so with `voiceschanged`; Safari on iOS sometimes doesn't fire it, so
 * the list is also read again a few times.
 */
const RECHECK_MS = [250, 1000, 3000];

/**
 * The local English voice for Listen, or null (none yet, or none at all).
 * Updates when the browser's voice list changes.
 */
export function useListenVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => {
    const synth = getSpeechSynthesis();
    return synth ? pickListenVoice(synth.getVoices()) : null;
  });

  useEffect(() => {
    const synth = getSpeechSynthesis();
    if (!synth) return undefined;
    const refresh = () => {
      const next = pickListenVoice(synth.getVoices());
      // Keep the same object while the choice stays the same, so nothing restarts.
      setVoice((current) => (current && next && current.voiceURI === next.voiceURI ? current : next));
    };
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    const timers = RECHECK_MS.map((ms) => setTimeout(refresh, ms));
    return () => {
      synth.removeEventListener('voiceschanged', refresh);
      timers.forEach(clearTimeout);
    };
  }, []);

  return voice;
}
