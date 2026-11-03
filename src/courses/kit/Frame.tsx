import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { StatusBanner } from '../../components/ds';
import { useCatalog } from '../../content/useCatalog';
import { CourseContentProvider, useLessonContent } from '../../content/useContent';
import { SOURCE_LOCALE, useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import type { OurWorldName } from '../types';
import { PreviewCourseContext, useCourseContent, usePreviewCourse, type PreviewCourseConfig } from './course';
import { CourseWords } from './i18n';

const OurWorldContext = createContext<OurWorldName>({ title: '', lang: {} });

/**
 * Every page of a preview course: the course (PreviewCourseContext), the
 * shared preview words and its own (./i18n.tsx), its content in the language
 * on screen, translated where it is (Indonesian, Malay) and English
 * otherwise, for the shared lesson pages (CourseContentProvider), and on screen
 * the draft banner above the page. Our World's title is read here, before
 * the course's words take over, so the course choice shows it in the
 * language on screen.
 */
export function PreviewCourseFrame({ course, children, banner = true }: { course: PreviewCourseConfig; children: ReactNode; banner?: boolean }) {
  const { contentLang } = useI18n();
  const title = useCatalog().getCourse().course.title;
  const ourWorld = useMemo(() => ({ title, lang: contentLang }), [title, contentLang]);
  const content = useCourseContent(course);
  return (
    <PreviewCourseContext.Provider value={course}>
      <OurWorldContext.Provider value={ourWorld}>
        <CourseWords words={course.words} translated={content !== course.content}>
          <CourseContentProvider value={content}>
            {banner ? <DraftBanner /> : null}
            {children}
          </CourseContentProvider>
        </CourseWords>
      </OurWorldContext.Provider>
    </PreviewCourseContext.Provider>
  );
}

/** Our World's title in the language on screen (inside PreviewCourseFrame). */
export function useOurWorldName(): OurWorldName {
  return useContext(OurWorldContext);
}

/** The course's title in the language on screen (inside PreviewCourseFrame; mark it with contentLang). */
export function useCourseTitle(): string {
  return useLessonContent().getCourse().course.title;
}

/**
 * "Draft course: not yet reviewed", on every page of a preview course, with
 * a way to turn the preview off (which goes back to Our World's map). Never
 * printed: the sheets carry their own note (DraftSheetNote).
 */
export function DraftBanner() {
  const { t, locale } = useI18n();
  const course = usePreviewCourse();
  const translated = useLessonContent() !== course.content;
  const { setPreviewCourse } = useLearnerSession();
  const navigate = useNavigate();
  return (
    <div className="tw-pc-banner tw-no-print">
      <StatusBanner
        tone="info"
        icon="Info"
        title={t('previewCourse.banner.title')}
        action={t('previewCourse.banner.turnOff')}
        onAction={() => {
          void navigate('/course');
          setPreviewCourse(course.id, false).catch((error: unknown) => {
            if (import.meta.env.DEV) console.error(error);
          });
        }}
      >
        {/* In another language the interface is translated; when the lessons aren't (yet), say so. */}
        {t(locale === SOURCE_LOCALE || translated ? course.wordKeys.bannerBody : course.wordKeys.bannerBodyEnglishLessons)}
      </StatusBanner>
    </div>
  );
}

/** The draft note at the top of each printed sheet (the print view, the teacher guide). */
export function DraftSheetNote() {
  const { tx, contentLang } = useI18n();
  const title = useCourseTitle();
  return (
    <p className="tw-pc-sheet-note">
      <strong>{tx('previewCourse.sheet.draft', { title: <span {...contentLang}>{title}</span> })}</strong>
    </p>
  );
}
