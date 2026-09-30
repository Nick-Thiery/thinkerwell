import { describe, expect, it } from 'vitest';
import { findLocale } from '../i18n/locales';
import { DEFAULT_SETTINGS } from '../storage/types';
import { speechCheckFor, speechCheckPatch, speechLangFor } from './language';

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
