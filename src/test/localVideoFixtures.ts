import type { LocalVideosFile } from '../content/schema';
import type { ContentTranslation, LoadedLocale } from '../i18n/core';

/**
 * Test-only local-language videos (e2e-dev/fixtures/local-videos/id.json, the
 * file the dev server serves for the end-to-end test): Lesson 5 has an
 * approved video of its own, Lesson 9 only an entry that is not approved.
 * None of this is in content/, so nothing here can reach learners.
 */
const files = import.meta.glob<LocalVideosFile>('../../e2e-dev/fixtures/local-videos/id.json', { eager: true, import: 'default' });

export const ID_VIDEOS_FIXTURE: LocalVideosFile = structuredClone(Object.values(files)[0]!);

/** The fixture's approved video id, which appears nowhere in the real content. */
export const FIXTURE_VIDEO_ID = 'tw_test_vid';
export const FIXTURE_UNAPPROVED_ID = 'tw_test_nop';

/** An Indonesian content translation that has only a videos file (the lessons stay English underneath). */
export function translationWithVideos(videos: unknown): ContentTranslation {
  return { course: {}, lessons: {}, quizzes: {}, visuals: {}, videos };
}

/** A loaded Indonesian locale with no messages (they fall back to English) and the given content. */
export function indonesianLocale(content: ContentTranslation): LoadedLocale {
  return {
    definition: { code: 'id', englishName: 'Indonesian', endonym: 'Bahasa Indonesia', dir: 'ltr', font: 'latin', ready: true, content: true },
    messages: {},
    content,
  };
}
