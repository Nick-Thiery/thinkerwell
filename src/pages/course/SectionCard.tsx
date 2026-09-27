import { lessonPath, sectionCheckPath } from '../../app/lessonUrls';
import type { Lesson, Section } from '../../content';
import { Button, LessonRow, SectionHeader } from '../../components/ds';
import { useI18n } from '../../i18n';
import { isLessonComplete, nextStageForLesson, sectionProgress, stagesDoneForLesson, type ProgressByLessonId } from '../../storage';

export interface SectionCardProps {
  section: Section;
  lessons: readonly Lesson[];
  progress: ProgressByLessonId;
  /** The one lesson to highlight (findContinueTarget's result), or undefined for a guest or a finished learner. */
  highlightLessonId?: string;
  /** True while looking around: never marks a lesson done or in progress. */
  hideProgress?: boolean;
  /** Collapsed sections show a one-line summary instead of every lesson. */
  expanded: boolean;
  onToggle: () => void;
}

/**
 * One section of the course map: its tinted SectionHeader, a one-line
 * summary shown only while collapsed, and every LessonRow (plus a "quiz" row
 * for the section check) shown only while expanded (docs/screens/Course.dc.html).
 * Nothing is ever locked, so every row stays a real link regardless of
 * status; collapsing is only about how much of the page is on screen at once.
 *
 * The disclosure button is a single element that stays mounted at the same
 * spot whether the section is open or closed (its label and aria-expanded
 * just change) and the lesson list underneath is toggled with the `hidden`
 * attribute rather than being added or removed from the tree. Two separate
 * "Show"/"Hide" buttons used to swap places on toggle, which dropped
 * keyboard and screen-reader focus to <body> every time (r2-checks-2 /
 * r2-rules-2), and left aria-controls pointing at an id that didn't exist
 * while collapsed.
 */
export function SectionCard({ section, lessons, progress, highlightLessonId, hideProgress, expanded, onToggle }: SectionCardProps) {
  const { t } = useI18n();
  const { completed, total } = sectionProgress(section, lessons, progress);
  const firstLesson = section.lessons[0] ?? 0;
  const lastLesson = section.lessons[section.lessons.length - 1] ?? firstLesson;
  const range = firstLesson === lastLesson ? String(firstLesson) : t('pages.course.numberRange', { first: firstLesson, last: lastLesson });
  const bodyId = `${section.id}-body`;
  const allDone = total > 0 && completed === total;

  return (
    <section id={section.id} aria-label={section.title} className="tw-course-section">
      <SectionHeader
        section={section.id}
        number={section.number}
        title={section.title}
        question={section.question}
        completed={hideProgress ? undefined : completed}
        total={hideProgress ? undefined : total}
      />
      <div className={expanded ? 'tw-course-section-meta tw-course-section-meta-open' : 'tw-course-section-meta'}>
        {expanded ? null : (
          <p className="body tw-course-section-summary">
            {hideProgress || !allDone ? t('pages.course.lessonsRange', { range }) : t('pages.course.allDoneCheckReady', { count: total })}
          </p>
        )}
        <div className="tw-course-section-meta-actions">
          {!expanded && !hideProgress && allDone ? (
            <Button variant="secondary" href={sectionCheckPath(section.id)}>
              {t('pages.home.dashboard.startCheck')}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onToggle} aria-expanded={expanded} aria-controls={bodyId}>
            {expanded ? t('pages.course.hideLessons') : t('pages.course.showLessons', { count: lessons.length })}
          </Button>
        </div>
      </div>
      <div id={bodyId} hidden={!expanded} className="tw-course-section-body">
        {lessons.map((lesson) => {
          const record = hideProgress ? undefined : progress.get(lesson.id);
          const done = isLessonComplete(record);
          const [min, max] = lesson.estimatedMinutes;
          // Lemon (tw-now, via `current`) marks the one step a learner is
          // actually mid-way through. A lesson with no record yet (never
          // opened) or that's already finished has no "current" step to
          // show — only an in-progress lesson does.
          const inProgress = Boolean(record) && !done;
          return (
            <LessonRow
              key={lesson.id}
              number={lesson.number}
              title={lesson.title}
              question={lesson.essentialQuestion}
              time={t('lesson.minutes', { min, max })}
              status={done ? 'completed' : record ? 'in-progress' : 'not-started'}
              done={stagesDoneForLesson(record)}
              current={inProgress ? nextStageForLesson(record) : undefined}
              highlight={lesson.id === highlightLessonId}
              href={lessonPath(lesson.id, done ? 'read' : nextStageForLesson(record))}
            />
          );
        })}
        <LessonRow
          kind="quiz"
          title={t('pages.course.sectionCheckRowTitle', { title: section.title })}
          question={t('pages.course.sectionCheckQuestion', { range })}
          href={sectionCheckPath(section.id)}
        />
      </div>
    </section>
  );
}
