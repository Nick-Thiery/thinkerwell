import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useI18n, type I18nContextValue, type MessageKey } from '../../i18n';
import { CourseWords, withCourseWords } from './i18n';

// Digital World's own words load with its code (the build leaves them out of
// the app's messages), and under its pages the lessons are English in every
// language: marked lang="en" and read as English, with the interface in the
// learner's language.

async function i18nIn(locale: string): Promise<I18nContextValue> {
  const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider locale={locale}>{children}</I18nProvider>;
  const { result } = renderHook(() => useI18n(), { wrapper });
  await waitFor(() => expect(result.current.locale).toBe(locale));
  return result.current;
}

describe('withCourseWords', () => {
  const own = {
    en: { digitalWorld: { banner: { title: 'Draft course: not yet reviewed', turnOff: 'Turn preview off' } } },
    id: { digitalWorld: { banner: { title: 'Kursus draf: belum ditinjau' } } },
  };
  const key = (k: string) => k as MessageKey;

  it('gives the course’s words in the language on screen, then English, and the app’s own words as they were', async () => {
    const indonesian = withCourseWords(await i18nIn('id'), own);
    expect(indonesian.t(key('digitalWorld.banner.title'))).toBe('Kursus draf: belum ditinjau');
    expect(indonesian.t('nav.course')).toBe((await i18nIn('id')).t('nav.course'));
    const english = withCourseWords(await i18nIn('en'), own);
    expect(english.t(key('digitalWorld.banner.turnOff'))).toBe('Turn preview off');
  });

  it('marks the lessons as English in Indonesian, so screen readers, Listen and Say it treat them as English', async () => {
    const indonesian = withCourseWords(await i18nIn('id'), own);
    expect(indonesian.content).toBeUndefined();
    expect(indonesian.contentLang).toEqual({ lang: 'en' });
    expect(indonesian.contentLocale.code).toBe('en');
    // The interface itself stays Indonesian.
    expect(indonesian.locale).toBe('id');
  });

  it('changes nothing about how English pages mark text', async () => {
    const english = withCourseWords(await i18nIn('en'), own);
    expect(english.contentLang).toEqual({});
  });

  it('is what CourseWords gives every Digital World page, with the real words', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider locale="id">
        <CourseWords>{children}</CourseWords>
      </I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('id'));
    expect(result.current.t('digitalWorld.banner.title')).toBe('Kursus draf: belum ditinjau');
    expect(result.current.t('digitalWorld.trainModel.score', { right: 4, of: 6 })).toBe('Model benar 4 dari 6.');
  });
});
