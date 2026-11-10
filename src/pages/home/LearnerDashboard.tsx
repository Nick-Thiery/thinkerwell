import { lazy, Suspense, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { LanguageChoice, useHasLanguageChoice } from '../../app/LanguageChoice';
import { lessonPath } from '../../app/lessonUrls';
import { courseSummaries } from '../../content/catalog';
import { COURSES, DEFAULT_COURSE_ID } from '../../content/courses';
import { useCourseOutlines } from '../../content/outline';
import { STAGES, STAGES_WITHOUT_WATCH, type StageId } from '../../content/stages';
import { useCatalog } from '../../content/useCatalog';
import { Badge, Button, Icon, StageDots, type IconName } from '../../components/ds';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import { stagesDoneForLesson, type Learner, type ProgressByLessonId } from '../../storage';
import { courseCount, homeTarget, latestWriting, platformCount, type PlatformCourse } from './platformProgress';

// The offline count reads what is kept on the device (the Cache API, the course list): loaded after the first paint, so a first visit doesn't download it.
const OfflineStatus = lazy(() => import('./OfflineStatus'));

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

export interface LearnerDashboardProps {
  learner: Learner;
  progress: ProgressByLessonId;
}

/** A name that is course text: in the language on screen where the course has one, else English (marked). */
function useNamed() {
  const { contentLang, contentLocale } = useI18n();
  return (titles: Readonly<Record<string, string>>): { node: ReactNode; text: string } => {
    const translated = titles[contentLocale.code];
    const text = translated ?? titles.en ?? '';
    return { text, node: <span {...(translated ? contentLang : { lang: 'en' })}>{text}</span> };
  };
}

/**
 * The learner Home once a profile is chosen (Justin's brief of 10 November
 * 2026, section 16): a greeting, one progress bar over every course, one card
 * for where to go next, the four courses, the journal and the language.
 * Everything is worked out from the saved progress and the build-time lesson
 * lists (./platformProgress.ts), so no course has to be loaded to show it.
 */
export function LearnerDashboard({ learner, progress }: LearnerDashboardProps) {
  const { t, tx, contentLang, contentLocale } = useI18n();
  const catalog = useCatalog();
  const named = useNamed();
  const { previewCourses } = useLearnerSession();
  const hasLanguageChoice = useHasLanguageChoice();
  const coursesRef = useId();

  const ourWorldTitle = catalog.getCourse().course.title;
  const ourWorldLessons = catalog.getLessons();
  const courses: PlatformCourse[] = useMemo(
    () => [
      { id: DEFAULT_COURSE_ID, lessonIds: ourWorldLessons.map((lesson) => lesson.id) },
      ...COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID && previewCourses.includes(course.id) && courseSummaries[course.id]).map((course) => ({
        id: course.id,
        lessonIds: courseSummaries[course.id]!.lessonIds,
      })),
    ],
    [ourWorldLessons, previewCourses],
  );

  const translated = contentLocale.code !== 'en';
  const stagesOf = (courseId: string, lessonId: string, video?: boolean): readonly StageId[] => {
    if (courseId === DEFAULT_COURSE_ID) {
      const lesson = ourWorldLessons.find((l) => l.id === lessonId);
      return lesson ? catalog.stagesFor(lesson) : STAGES;
    }
    return translated || video === false ? STAGES_WITHOUT_WATCH : STAGES;
  };
  const courseOf = (lessonId: string) => courses.find((course) => course.lessonIds.includes(lessonId))!;

  const totals = platformCount(courses, progress);
  const target = homeTarget(courses, progress, (lessonId) => stagesOf(courseOf(lessonId).id, lessonId));

  // The titles of lessons in the other courses come from their build-time outline, loaded only when the card needs one.
  const lessonCourse = target.kind === 'resume' || target.kind === 'next' ? target.courseId : null;
  const { outlines } = useCourseOutlines(lessonCourse !== null && lessonCourse !== DEFAULT_COURSE_ID);

  const courseName = (id: string) => (id === DEFAULT_COURSE_ID ? { node: <span {...contentLang}>{ourWorldTitle}</span>, text: ourWorldTitle } : named(courseSummaries[id]?.titles ?? {}));

  const focusCourses = () => {
    const heading = document.getElementById(coursesRef);
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  };

  return (
    <div className="tw-dash">
      <div className="tw-dash-head">
        <h1 className="h1" tabIndex={-1}>
          {t('pages.home.dashboard.greeting', { name: learner.name })}
        </h1>
        <Badge tone="outline" icon="Lock">
          {t('pages.home.dashboard.savedBadge')}
        </Badge>
      </div>

      <ProgressCard completed={totals.completed} total={totals.total} />

      <NextCard
        target={target}
        courseName={courseName}
        lessonInfo={(courseId, lessonId) => {
          if (courseId === DEFAULT_COURSE_ID) {
            const lesson = ourWorldLessons.find((l) => l.id === lessonId);
            return lesson ? { number: lesson.number, title: <span {...contentLang}>{lesson.title}</span>, video: undefined } : null;
          }
          const lesson = outlines?.[courseId]?.lessons.find((l) => l.id === lessonId);
          return lesson ? { number: lesson.number, title: named(lesson.titles).node, video: lesson.video } : null;
        }}
        stagesOf={stagesOf}
        progress={progress}
        onChoose={focusCourses}
        tx={tx}
      />

      <div className="tw-dash-grid">
        <section aria-labelledby={coursesRef} className="tw-dash-sections">
          <h2 id={coursesRef} className="h2" tabIndex={-1}>
            {t('pages.home.dashboard.coursesTitle')}
          </h2>
          <ul className="tw-dash-courses" role="list">
            {courses.map((course) => {
              const { completed, total } = courseCount(course, progress);
              const name = courseName(course.id);
              const definition = COURSES.find((c) => c.id === course.id);
              return (
                <li key={course.id} className="tw-dash-course">
                  <span className="tw-dash-course-icon">
                    <Icon name={(course.id === DEFAULT_COURSE_ID ? 'Globe' : (definition?.icon ?? 'BookOpen')) as IconName} size={22} />
                  </span>
                  <span className="tw-dash-course-text">
                    <span className="tw-dash-course-name">{name.node}</span>
                    <span className="small tw-dash-course-count">{t('pages.home.dashboard.courseCount', { completed, total })}</span>
                  </span>
                  <Button
                    variant="secondary"
                    href={course.id === DEFAULT_COURSE_ID ? '/course' : `/course/${course.id}`}
                    aria-label={t('pages.home.dashboard.openCourseLabel', { course: name.text })}
                  >
                    {t('pages.home.dashboard.openCourse')}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="tw-dash-aside">
          <JournalPreview courses={courses} progress={progress} courseName={courseName} />
          {hasLanguageChoice ? <DashboardLanguage /> : null}
          <Suspense fallback={null}>
            <OfflineStatus courses={courses} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}

/**
 * "Your progress": lessons finished out of every lesson in every course, as a
 * slim bar. The mascot rides the end of the filled part as decoration only
 * (hidden from assistive technology); the bar itself is the progressbar. It
 * keeps inside the bar at none and at all, and doesn't glide with reduced motion.
 */
function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const { t } = useI18n();
  const titleId = useId();
  const share = total > 0 ? completed / total : 0;
  const text = t('pages.home.dashboard.progressCount', { completed, total });
  return (
    <section className="tw-progress-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="h3">
        {t('pages.home.dashboard.progressTitle')}
      </h2>
      <p className="body-lg tw-progress-text">{text}</p>
      <div
        className="tw-progress-track"
        role="progressbar"
        aria-labelledby={titleId}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={text}
        style={{ '--tw-share': share } as CSSProperties}
      >
        <span className="tw-progress-rail" aria-hidden="true">
          <span className="tw-progress-fill" />
        </span>
        <img className="tw-progress-mascot" src={MASCOT_SRC} alt="" aria-hidden="true" width={44} height={44} />
      </div>
    </section>
  );
}

interface NextCardProps {
  target: ReturnType<typeof homeTarget>;
  courseName: (id: string) => { node: ReactNode; text: string };
  lessonInfo: (courseId: string, lessonId: string) => { number: number; title: ReactNode; video: boolean | undefined } | null;
  stagesOf: (courseId: string, lessonId: string, video?: boolean) => readonly StageId[];
  progress: ProgressByLessonId;
  onChoose: () => void;
  tx: ReturnType<typeof useI18n>['tx'];
}

/** The one card for where to go next: Start here, Resume here or Keep exploring. */
function NextCard({ target, courseName, lessonInfo, stagesOf, progress, onChoose, tx }: NextCardProps) {
  const { t } = useI18n();
  const headingId = useId();
  const toLesson = target.kind === 'resume' || target.kind === 'next';

  let eyebrow = t('pages.home.dashboard.startHere');
  let heading: ReactNode = t('pages.home.dashboard.chooseText');
  let sentence: string | null = null;
  let meta: ReactNode = null;
  let action: ReactNode = (
    <Button variant="primary" size="lg" iconRight="ChevronDown" onClick={onChoose}>
      {t('pages.home.dashboard.chooseCourse')}
    </Button>
  );

  if (target.kind === 'explore') {
    eyebrow = t('pages.home.dashboard.keepExploring');
    heading = t('pages.home.dashboard.finishedBody');
  } else if (toLesson) {
    const course = courseName(target.courseId);
    const info = lessonInfo(target.courseId, target.lessonId);
    const stages = stagesOf(target.courseId, target.lessonId, info?.video);
    const stage = target.kind === 'resume' ? target.stage : 'read';
    eyebrow = t('pages.home.dashboard.resumeHere');
    heading = info?.title ?? course.node;
    sentence = t('pages.home.dashboard.resumeText');
    meta = (
      <div className="tw-continue-meta">
        {info ? <span>{tx('pages.course.lessonLabel', { number: info.number, section: course.node })}</span> : null}
        {info ? <StageDots done={stagesDoneForLesson(progress.get(target.lessonId)).filter((s) => stages.includes(s))} current={stage} stages={stages} /> : null}
        <span>{t('lesson.nextStep', { stage: t(`stages.${stage}`) })}</span>
      </div>
    );
    action = (
      <Button variant="primary" size="lg" iconRight="ArrowRight" href={lessonPath(target.lessonId, stage)}>
        {t(target.kind === 'resume' ? 'pages.home.dashboard.resumeLesson' : 'pages.home.dashboard.startLesson')}
      </Button>
    );
  }

  return (
    <section className="tw-continue" aria-labelledby={headingId}>
      <div>
        <span className="tw-continue-eyebrow">{eyebrow}</span>
        <h2 id={headingId} className="tw-continue-title">
          {heading}
        </h2>
        {sentence ? <p className="body-lg tw-continue-sentence">{sentence}</p> : null}
        {meta}
      </div>
      {action}
    </section>
  );
}

/** "My journal": the latest saved writing in any course, with the way to the journal. */
function JournalPreview({
  courses,
  progress,
  courseName,
}: {
  courses: readonly PlatformCourse[];
  progress: ProgressByLessonId;
  courseName: (id: string) => { node: ReactNode; text: string };
}) {
  const { t, tx } = useI18n();
  const entry = latestWriting(courses, progress);
  return (
    <section aria-labelledby="dash-journal-title" className="tw-journal-card">
      <h2 id="dash-journal-title" className="h3">
        {t('pages.home.dashboard.journalTitle')}
      </h2>
      {entry ? (
        <>
          <p className="small tw-journal-meta">{tx('pages.home.dashboard.latestEntry', { stage: t(`stages.${entry.stage}`), course: courseName(entry.courseId).node })}</p>
          <p className="body tw-journal-snippet">{entry.text.length > 160 ? `${entry.text.slice(0, 160)}…` : entry.text}</p>
        </>
      ) : (
        <p className="body">{t('pages.home.dashboard.noJournalYet')}</p>
      )}
      <Button variant="ghost" href="/journal">
        {t('pages.home.dashboard.openJournal')}
      </Button>
    </section>
  );
}

/**
 * The learner's own language, on their home: the app's one language
 * setting, as in the header's switch. Only once a second language is ready.
 * Changing it switches every page at once and saves it on their record.
 */
function DashboardLanguage() {
  const { t } = useI18n();
  const { language, setLanguage } = useLearnerSession();
  const [failed, setFailed] = useState(false);
  const helpId = useId();
  return (
    <section aria-labelledby="dash-language-title" className="tw-journal-card">
      <h2 id="dash-language-title" className="h3">
        {t('pages.home.dashboard.languageTitle')}
      </h2>
      <LanguageChoice
        label={t('pages.home.dashboard.languageTitle')}
        describedBy={helpId}
        value={language}
        onChange={(code) => {
          setFailed(false);
          setLanguage(code).catch(() => setFailed(true));
        }}
      />
      <p id={helpId} className="small">
        {t('pages.home.dashboard.languageHelp')}
        {failed ? ` ${t('pages.home.dashboard.languageSaveFailed')}` : ''}
      </p>
    </section>
  );
}
