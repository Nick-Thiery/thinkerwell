import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useCatalog } from '../../content/useCatalog';
import { CourseContentProvider, useLessonContent } from '../../content/useContent';
import { useI18n } from '../../i18n';
import type { OurWorldName } from '../types';
import { PreviewCourseContext, useCourseContent, type PreviewCourseConfig } from './course';
import { CourseWords } from './i18n';

const OurWorldContext = createContext<OurWorldName>({ title: '', lang: {} });

/**
 * Every page of a preview course: the course (PreviewCourseContext), the
 * shared preview words and its own (./i18n.tsx), its content in the language
 * on screen, translated where it is (Indonesian, Malay) and English
 * otherwise, for the shared lesson pages (CourseContentProvider). Our World's
 * title is read here, before the course's words take over, for the pages
 * that name it (the preview switch page).
 */
export function PreviewCourseFrame({ course, children }: { course: PreviewCourseConfig; children: ReactNode }) {
  const { contentLang } = useI18n();
  const title = useCatalog().getCourse().course.title;
  const ourWorld = useMemo(() => ({ title, lang: contentLang }), [title, contentLang]);
  const content = useCourseContent(course);
  return (
    <PreviewCourseContext.Provider value={course}>
      <OurWorldContext.Provider value={ourWorld}>
        <CourseWords words={course.words} translated={content !== course.content}>
          <CourseContentProvider value={content}>{children}</CourseContentProvider>
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

/** The note at the top of each printed sheet (the print view, the teacher guide): a new course whose facts are still being checked. */
export function DraftSheetNote() {
  const { tx, contentLang } = useI18n();
  const title = useCourseTitle();
  return (
    <p className="tw-pc-sheet-note">
      <strong>{tx('previewCourse.sheet.draft', { title: <span {...contentLang}>{title}</span> })}</strong>
    </p>
  );
}
