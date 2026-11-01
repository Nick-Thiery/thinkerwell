import { useMemo, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { resolveLessonPrintRoute, resolveLessonRoute, resolveTeacherGuideRoute } from '../../app/lessonRoutes';
import { usePageTitle } from '../../app/usePageTitle';
import type { CourseLesson } from '../../content';
import { useI18n } from '../../i18n';
import { LessonPlayerProvider } from '../../lesson';
import { LessonExtrasProvider, type LessonExtras } from '../../lesson/extras';
import { TeacherGuidePage } from '../../pages/educators/TeacherGuidePage';
import { LessonPage } from '../../pages/lesson/LessonPage';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { LessonPrintPage, LessonPrintSheet } from '../../pages/print/LessonPrintPage';
import { PrintToolbar } from '../../pages/print/PrintToolbar';
import { usePreviewCourse } from './course';
import { DraftSheetNote, PreviewCourseFrame, useCourseTitle } from './Frame';
import { ReviewerNotes } from './ReviewerNotes';

/**
 * What a preview course's lesson adds to the shared lesson pages
 * (src/lesson/extras.tsx): the draft note on every sheet, the notes for
 * reviewers at the end of the teacher guide, and whatever the course adds
 * itself (Digital World's activities: PreviewCourseConfig.lessonSlot).
 */
export function useLessonExtras(lesson: CourseLesson): LessonExtras {
  const course = usePreviewCourse();
  return useMemo(
    () => ({
      slot: (name) => {
        if (name === 'sheet:top') return <DraftSheetNote />;
        if (name === 'guide:end') return <ReviewerNotes lesson={lesson} />;
        return course.lessonSlot?.(lesson, name) ?? null;
      },
    }),
    [lesson, course],
  );
}

function WithExtras({ lesson, children }: { lesson: CourseLesson; children: ReactNode }) {
  return <LessonExtrasProvider value={useLessonExtras(lesson)}>{children}</LessonExtrasProvider>;
}

/** /lesson/<prefix>…/:stage: the shared lesson player, with the course's content, words and additions. */
export function PreviewLessonRoute({ lessonId, stage }: { lessonId: string; stage: string | undefined }) {
  const { search, hash } = useLocation();
  const course = usePreviewCourse();
  const result = resolveLessonRoute(lessonId, stage, course.content);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'not-found':
      return <NotFoundPage />;
    case 'show':
      return (
        <PreviewCourseFrame course={course}>
          <WithExtras lesson={result.lesson}>
            <LessonPlayerProvider key={result.lesson.id} lesson={result.lesson} step={result.step}>
              <LessonPage key={result.step} />
            </LessonPlayerProvider>
          </WithExtras>
        </PreviewCourseFrame>
      );
  }
}

/** /lesson/<prefix>…/print: the shared print view. */
export function PreviewLessonPrintRoute({ lessonId }: { lessonId: string }) {
  const { search, hash } = useLocation();
  const course = usePreviewCourse();
  const result = resolveLessonPrintRoute(lessonId, course.content);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'not-found':
      return <NotFoundPage />;
    case 'show':
      return (
        <PreviewCourseFrame course={course}>
          <WithExtras lesson={result.lesson}>
            <LessonPrintPage lesson={result.lesson} />
          </WithExtras>
        </PreviewCourseFrame>
      );
  }
}

/** /educators/lesson/<prefix>…: the shared teacher guide, with the notes for reviewers. */
export function PreviewTeacherGuideRoute({ lessonId }: { lessonId: string }) {
  const { search, hash } = useLocation();
  const course = usePreviewCourse();
  const result = resolveTeacherGuideRoute(lessonId, course.content);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'not-found':
      return <NotFoundPage />;
    case 'show':
      return (
        <PreviewCourseFrame course={course}>
          <WithExtras lesson={result.lesson}>
            <TeacherGuidePage key={result.lesson.id} lesson={result.lesson} />
          </WithExtras>
        </PreviewCourseFrame>
      );
  }
}

/**
 * /course/<id>/print: every lesson's print view, one after another (each
 * lesson starts on a new page of paper), with what the course adds, so a
 * reviewer can read the whole course on paper or as a PDF.
 */
export function AllLessons() {
  // Inside the course's PreviewCourseFrame (./index.tsx).
  const { t, tx, contentLang } = useI18n();
  const course = usePreviewCourse();
  const title = useCourseTitle();
  usePageTitle(t('previewCourse.printAll.pageTitle', { title }));
  const named = { title: <span {...contentLang}>{title}</span> };
  return (
    <div className="tw-print-page tw-pc-print-all">
      <PrintToolbar backHref={course.path} backLabel={t('previewCourse.printAll.back', { title })} />
      <p className="tw-print-intro tw-no-print">{tx('previewCourse.printAll.intro', named)}</p>
      {course.content.getLessons().map((lesson, index) => (
        <WithExtras key={lesson.id} lesson={lesson}>
          <LessonPrintSheet lesson={lesson} titleId={`print-title-${lesson.id}`} newPage={index > 0} />
        </WithExtras>
      ))}
    </div>
  );
}
