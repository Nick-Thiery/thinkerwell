/**
 * Which language Listen and Say it use: the lesson's. That is English,
 * except for a learner whose lessons are translated (Indonesian: id-ID).
 * Settings keeps the educator's "Check this device" answer per language:
 * English in settings.speechCheck (as before), any other in
 * settings.speechChecks, keyed by this tag. Listen's chosen voice is kept
 * per language too, in settings.listenVoices ("en", "id").
 */
import { readyLocales, type LocaleDefinition } from '../i18n/locales';
import type { DeviceSettings, ListenVoiceChoice, SpeechCheck } from '../storage/types';
import { DICTATION_LANG } from './recognition';
import { baseLang } from './voiceRanking';

/** The speech tag for a lesson language: 'en-US' for English (as Say it always used), 'id-ID' for Indonesian. */
export function speechLangFor(contentLocale: LocaleDefinition): string {
  return contentLocale.content && contentLocale.speechLang ? contentLocale.speechLang : DICTATION_LANG;
}

/** The saved "Check this device" answer for Say it in one language, or null. */
export function speechCheckFor(settings: Pick<DeviceSettings, 'speechCheck' | 'speechChecks'>, lang: string): SpeechCheck | null {
  if (lang === DICTATION_LANG) return settings.speechCheck;
  return settings.speechChecks?.[lang] ?? null;
}

/**
 * The languages Listen can read lessons in, as speech tags: English ("en",
 * any region), then each ready language whose lessons are translated
 * (Indonesian, "id-ID"). Settings offers a voice for each one the device has.
 */
export function listenLanguages(locales: readonly LocaleDefinition[] = readyLocales()): string[] {
  return ['en', ...locales.filter((locale) => locale.content && locale.speechLang).map((locale) => locale.speechLang!)];
}

/** Where Listen's chosen voice for a language is kept in settings.listenVoices: the language alone ("en", "id"). */
export function listenVoiceKey(speechLang: string): string {
  return baseLang(speechLang);
}

/** The voice an educator chose for Listen in one lesson language, or null (Automatic). */
export function listenVoiceFor(settings: Pick<DeviceSettings, 'listenVoices'> | null | undefined, speechLang: string): ListenVoiceChoice | null {
  return settings?.listenVoices?.[listenVoiceKey(speechLang)] ?? null;
}

/** The settings change that saves the voice for one lesson language, or goes back to Automatic (null). */
export function listenVoicePatch(
  settings: Pick<DeviceSettings, 'listenVoices'> | null | undefined,
  speechLang: string,
  choice: ListenVoiceChoice | null,
): Pick<DeviceSettings, 'listenVoices'> {
  const key = listenVoiceKey(speechLang);
  const rest = Object.fromEntries(Object.entries(settings?.listenVoices ?? {}).filter(([lang]) => lang !== key));
  return { listenVoices: choice ? { ...rest, [key]: choice } : rest };
}

/** The settings change that saves a "Check this device" answer for one language. */
export function speechCheckPatch(
  settings: Pick<DeviceSettings, 'speechChecks'> | null | undefined,
  lang: string,
  check: SpeechCheck,
): Partial<Pick<DeviceSettings, 'speechCheck' | 'speechChecks'>> {
  if (lang === DICTATION_LANG) return { speechCheck: check };
  return { speechChecks: { ...(settings?.speechChecks ?? {}), [lang]: check } };
}
