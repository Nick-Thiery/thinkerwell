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
import { ActivityOnPaper } from './activities/ActivityOnPaper';
import { ActivityPlayer } from './activities/ActivityPlayer';
import { COURSE_PATH, digitalWorld } from './content';
import { DigitalWorldFrame, DraftSheetNote } from './Frame';
import { ReviewerNotes } from './ReviewerNotes';

/**
 * What a Digital World lesson adds to the shared lesson pages
 * (src/lesson/extras.tsx): its activity where the lesson file puts it, the
 * activity on paper in the print view and (with what to expect) in the
 * teacher guide, the draft note on every sheet, and the notes for
 * reviewers at the end of the teacher guide.
 */
export function useLessonExtras(lesson: CourseLesson): LessonExtras {
  return useMemo(
    () => ({
      slot: (name) => {
        if (name === 'sheet:top') return <DraftSheetNote />;
        if (name === 'guide:end') return <ReviewerNotes lesson={lesson} />;
        const activity = lesson.activity;
        if (!activity) return null;
        if (name === `${activity.stage}:${activity.placement}`) return <ActivityPlayer activity={activity} />;
        if (name === 'print:after-evidence') return <ActivityOnPaper activity={activity} forTeachers={false} />;
        if (name === 'guide:after-evidence') return <ActivityOnPaper activity={activity} forTeachers />;
        return null;
      },
    }),
    [lesson],
  );
}

function WithExtras({ lesson, children }: { lesson: CourseLesson; children: ReactNode }) {
  return <LessonExtrasProvider value={useLessonExtras(lesson)}>{children}</LessonExtrasProvider>;
}

/** /lesson/dw-…/:stage: the shared lesson player, with Digital World's content, words and activity. */
export function DigitalWorldLessonRoute({ lessonId, stage }: { lessonId: string; stage: string | undefined }) {
  const { search, hash } = useLocation();
  const result = resolveLessonRoute(lessonId, stage, digitalWorld);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'not-found':
      return <NotFoundPage />;
    case 'show':
      return (
        <DigitalWorldFrame>
          <WithExtras lesson={result.lesson}>
            <LessonPlayerProvider key={result.lesson.id} lesson={result.lesson} step={result.step}>
              <LessonPage key={result.step} />
            </LessonPlayerProvider>
          </WithExtras>
        </DigitalWorldFrame>
      );
  }
}

/** /lesson/dw-…/print: the shared print view, with the activity on paper. */
export function DigitalWorldLessonPrintRoute({ lessonId }: { lessonId: string }) {
  const { search, hash } = useLocation();
  const result = resolveLessonPrintRoute(lessonId, digitalWorld);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'not-found':
      return <NotFoundPage />;
    case 'show':
      return (
        <DigitalWorldFrame>
          <WithExtras lesson={result.lesson}>
            <LessonPrintPage lesson={result.lesson} />
          </WithExtras>
        </DigitalWorldFrame>
      );
  }
}

/** /educators/lesson/dw-…: the shared teacher guide, with the activity, what to expect, and notes for reviewers. */
export function DigitalWorldTeacherGuideRoute({ lessonId }: { lessonId: string }) {
  const { search, hash } = useLocation();
  const result = resolveTeacherGuideRoute(lessonId, digitalWorld);
  switch (result.kind) {
    case 'redirect':
      return <Navigate replace to={`${result.to}${search}${hash}`} />;
    case 'not-found':
      return <NotFoundPage />;
    case 'show':
      return (
        <DigitalWorldFrame>
          <WithExtras lesson={result.lesson}>
            <TeacherGuidePage key={result.lesson.id} lesson={result.lesson} />
          </WithExtras>
        </DigitalWorldFrame>
      );
  }
}

/**
 * /course/digital-world/print: every lesson's print view, one after another
 * (each lesson starts on a new page of paper), with its activity, so a
 * reviewer can read the whole course on paper or as a PDF.
 */
export function CoursePrintPage() {
  return (
    <DigitalWorldFrame>
      <AllLessons />
    </DigitalWorldFrame>
  );
}

function AllLessons() {
  const { t } = useI18n();
  usePageTitle(t('digitalWorld.printAll.pageTitle'));
  return (
    <div className="tw-print-page tw-dw-print-all">
      <PrintToolbar backHref={COURSE_PATH} backLabel={t('digitalWorld.printAll.back')} />
      <p className="tw-print-intro tw-no-print">{t('digitalWorld.printAll.intro')}</p>
      {digitalWorld.getLessons().map((lesson, index) => (
        <WithExtras key={lesson.id} lesson={lesson}>
          <LessonPrintSheet lesson={lesson} titleId={`print-title-${lesson.id}`} newPage={index > 0} />
        </WithExtras>
      ))}
    </div>
  );
}
