/**
 * Which language Listen and Say it use: the lesson's. That is English,
 * except for a learner whose lessons are translated (Indonesian: id-ID).
 * Settings keeps the educator's "Check this device" answer per language:
 * English in settings.speechCheck (as before), any other in
 * settings.speechChecks, keyed by this tag.
 */
import type { LocaleDefinition } from '../i18n/locales';
import type { DeviceSettings, SpeechCheck } from '../storage/types';
import { DICTATION_LANG } from './recognition';

/** The speech tag for a lesson language: 'en-US' for English (as Say it always used), 'id-ID' for Indonesian. */
export function speechLangFor(contentLocale: LocaleDefinition): string {
  return contentLocale.content && contentLocale.speechLang ? contentLocale.speechLang : DICTATION_LANG;
}

/** The saved "Check this device" answer for Say it in one language, or null. */
export function speechCheckFor(settings: Pick<DeviceSettings, 'speechCheck' | 'speechChecks'>, lang: string): SpeechCheck | null {
  if (lang === DICTATION_LANG) return settings.speechCheck;
  return settings.speechChecks?.[lang] ?? null;
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
