import { describe, expect, it } from 'vitest';
import { findLocale, LOCALES } from '../i18n/locales';
import { DEFAULT_SETTINGS } from '../storage/types';
import { listenLanguages, listenVoiceFor, listenVoicePatch, speechCheckFor, speechCheckPatch, speechLangFor } from './language';
import { listenSample, LISTEN_SAMPLES } from './sample';

const checked = { status: 'available' as const, checkedAt: '2026-09-29T08:00:00.000Z' };

describe('the speech language', () => {
  it('is id-ID for Indonesian lessons and en-US for English ones, whatever the interface', () => {
    expect(speechLangFor(findLocale('id')!)).toBe('id-ID');
    expect(speechLangFor(findLocale('en')!)).toBe('en-US');
    expect(speechLangFor(findLocale('fa-AF')!)).toBe('en-US');
  });
});

describe("an educator's Say it check, per language", () => {
  it('keeps English where it always was, and Indonesian beside it', () => {
    expect(speechCheckPatch(DEFAULT_SETTINGS, 'en-US', checked)).toEqual({ speechCheck: checked });
    const patch = speechCheckPatch(DEFAULT_SETTINGS, 'id-ID', checked);
    expect(patch).toEqual({ speechChecks: { 'id-ID': checked } });
    const settings = { ...DEFAULT_SETTINGS, ...patch };
    expect(speechCheckFor(settings, 'id-ID')).toEqual(checked);
    expect(speechCheckFor(settings, 'en-US')).toBeNull();
  });

  it("never counts English's check for Indonesian", () => {
    const settings = { ...DEFAULT_SETTINGS, speechCheck: checked };
    expect(speechCheckFor(settings, 'en-US')).toEqual(checked);
    expect(speechCheckFor(settings, 'id-ID')).toBeNull();
  });
});

describe("Listen's voice, chosen per language", () => {
  const daniel = { name: 'Daniel', voiceURI: 'com.apple.voice.compact.en-GB.Daniel', lang: 'en-GB' };
  const damayanti = { name: 'Damayanti', voiceURI: 'com.apple.voice.compact.id-ID.Damayanti', lang: 'id-ID' };

  it('is English, then each ready language whose lessons are translated', () => {
    expect(listenLanguages()).toEqual(['en', 'id-ID', 'ms-MY']);
    expect(listenLanguages(LOCALES.filter((locale) => locale.code === 'en'))).toEqual(['en']);
  });

  it('keeps each language apart, by language alone, and goes back to Automatic', () => {
    expect(listenVoiceFor(DEFAULT_SETTINGS, 'en')).toBeNull();
    const english = { ...DEFAULT_SETTINGS, ...listenVoicePatch(DEFAULT_SETTINGS, 'en-US', daniel) };
    expect(english.listenVoices).toEqual({ en: daniel });
    // Any English tag finds it: lessons ask for "en", Say it's "en-US" is the same language.
    expect(listenVoiceFor(english, 'en')).toEqual(daniel);
    expect(listenVoiceFor(english, 'en-GB')).toEqual(daniel);
    expect(listenVoiceFor(english, 'id-ID')).toBeNull();

    const both = { ...english, ...listenVoicePatch(english, 'id-ID', damayanti) };
    expect(both.listenVoices).toEqual({ en: daniel, id: damayanti });
    const automatic = { ...both, ...listenVoicePatch(both, 'en', null) };
    expect(automatic.listenVoices).toEqual({ id: damayanti });
    expect(listenVoiceFor(automatic, 'en')).toBeNull();
    expect(listenVoiceFor(null, 'en')).toBeNull();
  });

  it('has a sample sentence in each lessons’ language', () => {
    for (const lang of listenLanguages()) {
      expect(LISTEN_SAMPLES[lang.split('-')[0]!], lang).toBeTruthy();
    }
    expect(listenSample('en-GB')).toBe(LISTEN_SAMPLES.en);
    expect(listenSample('in_ID')).toBe(LISTEN_SAMPLES.id);
    expect(listenSample('fa-IR')).toBe(LISTEN_SAMPLES.en);
  });
});
