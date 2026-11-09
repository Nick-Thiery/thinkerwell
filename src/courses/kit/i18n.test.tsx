import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useI18n, type I18nContextValue, type MessageKey } from '../../i18n';
import words from 'virtual:thinkerwell/course-messages/digital-world';
import { CourseWords, withCourseWords } from './i18n';

// A preview course's words (the shared preview words and its own) load with
// its code (the build leaves them out of the app's messages). Under its pages
// the lessons are English unless they are translated into the language on
// screen (Indonesian, Malay): English lessons are marked lang="en" and read as
// English, with the interface in the learner's language.

async function i18nIn(locale: string): Promise<I18nContextValue> {
  const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider locale={locale}>{children}</I18nProvider>;
  const { result } = renderHook(() => useI18n(), { wrapper });
  await waitFor(() => expect(result.current.locale).toBe(locale));
  return result.current;
}

describe('withCourseWords', () => {
  const own = {
    en: { digitalWorld: { reviewNote: 'Digital World is new.' } },
    id: { digitalWorld: { reviewNote: 'Dunia Digital adalah kursus baru.' } },
  };
  const key = (k: string) => k as MessageKey;

  it('gives the course’s words in the language on screen, then English, and the app’s own words as they were', async () => {
    const indonesian = withCourseWords(await i18nIn('id'), own);
    expect(indonesian.t(key('digitalWorld.reviewNote'))).toBe('Dunia Digital adalah kursus baru.');
    expect(indonesian.t('nav.course')).toBe((await i18nIn('id')).t('nav.course'));
    const english = withCourseWords(await i18nIn('en'), own);
    expect(english.t(key('digitalWorld.reviewNote'))).toBe('Digital World is new.');
  });

  it('marks the lessons as English in Indonesian, so screen readers, Listen and Say it treat them as English', async () => {
    const indonesian = withCourseWords(await i18nIn('id'), own);
    expect(indonesian.content).toBeUndefined();
    expect(indonesian.contentLang).toEqual({ lang: 'en' });
    expect(indonesian.contentLocale.code).toBe('en');
    // The interface itself stays Indonesian.
    expect(indonesian.locale).toBe('id');
  });

  it('marks translated lessons as the page is, so Listen and Say it use the language on screen', async () => {
    const parent = await i18nIn('id');
    const indonesian = withCourseWords(parent, own, true);
    expect(indonesian.contentLang).toEqual(parent.contentLang);
    expect(indonesian.contentLocale.code).toBe('id');
  });

  it('changes nothing about how English pages mark text', async () => {
    const english = withCourseWords(await i18nIn('en'), own);
    expect(english.contentLang).toEqual({});
  });

  it('is what CourseWords gives every Digital World page, with the real words, its own and the shared ones', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider locale="id">
        <CourseWords words={words}>{children}</CourseWords>
      </I18nProvider>
    );
    const { result } = renderHook(() => useI18n(), { wrapper });
    await waitFor(() => expect(result.current.locale).toBe('id'));
    expect(result.current.t('previewCourse.map.reviewAction')).toBe('Beri tahu kami apa yang perlu diperbaiki');
    expect(result.current.t('previewCourse.switch.open', { title: 'Digital World' })).toBe('Buka Digital World');
    expect(result.current.t('digitalWorld.trainModel.score', { right: 4, of: 6 })).toBe('Model benar 4 dari 6.');
  });
});
