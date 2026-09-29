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

/** "en-GB" → "en"; older Android and Java systems still say "in" for Indonesian. */
function baseLang(tag: string): string {
  const base = normalLang(tag).split('-')[0] ?? '';
  return base === 'in' ? 'id' : base;
}

/** Regional English voices in order of preference after the device's own default. */
const PREFERRED_LANGS = ['en-gb', 'en-us', 'en-au', 'en-ie', 'en-ca', 'en-nz', 'en-za', 'en-in'];

/**
 * The voice Listen reads with: a voice in the lesson's language
 * (`speechLang`, English unless given) that runs on the device. The
 * device's default voice wins if it qualifies (the learner or the school
 * may have chosen it); then, for English, British English (the course is
 * written in British spelling) and other English voices, and for another
 * language its own region (id-ID). null when there is none.
 */
export function pickListenVoice(voices: readonly SpeechSynthesisVoice[], speechLang = 'en'): SpeechSynthesisVoice | null {
  const base = baseLang(speechLang);
  const local = voices.filter((voice) => voice.localService && baseLang(voice.lang) === base);
  if (local.length === 0) return null;
  const preferredDefault = local.find((voice) => voice.default);
  if (preferredDefault) return preferredDefault;
  const preferred = base === 'en' ? PREFERRED_LANGS : [normalLang(speechLang)];
  for (const lang of preferred) {
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
 * The local voice for Listen in the lesson's language (`speechLang`, English
 * unless given), or null (none yet, or none at all). Updates when the
 * browser's voice list changes.
 */
export function useListenVoice(speechLang = 'en'): SpeechSynthesisVoice | null {
  return useListenVoiceState(speechLang).voice;
}

/**
 * The voice (as useListenVoice), and whether the browser has had time to
 * list its voices (after its last re-read, or at once without speech), so a
 * page can say "no voice" without flashing it while the list fills in.
 */
export function useListenVoiceState(speechLang = 'en'): { voice: SpeechSynthesisVoice | null; settled: boolean } {
  const [settled, setSettled] = useState(() => getSpeechSynthesis() === null);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => {
    const synth = getSpeechSynthesis();
    return synth ? pickListenVoice(synth.getVoices(), speechLang) : null;
  });

  useEffect(() => {
    const synth = getSpeechSynthesis();
    if (!synth) return undefined;
    const refresh = () => {
      const next = pickListenVoice(synth.getVoices(), speechLang);
      // Keep the same object while the choice stays the same, so nothing restarts.
      setVoice((current) => (current && next && current.voiceURI === next.voiceURI ? current : next));
    };
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
  }, [speechLang]);

  return { voice, settled };
}
