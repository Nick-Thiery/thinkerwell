import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { lessonPath, teacherGuidePath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Badge, Button, LessonRow, SectionHeader } from '../../components/ds';
import { En, useI18n } from '../../i18n';
import { useLearnerProgress, useLearnerSession } from '../../session';
import {
  findContinueTarget,
  isLessonComplete,
  nextStageForLesson,
  sectionProgress,
  stagesDoneForLesson,
  type ProgressByLessonId,
} from '../../storage';
import type { CourseLesson, CourseSection } from '../../content';
import { COURSE_ID, COURSE_PRINT_PATH, digitalWorld } from './content';
import { CourseChoice, DigitalWorldFrame, useOurWorldName } from './Frame';

/**
 * /course/digital-world: the course map, as Our World's but simpler: the
 * course choice, the four sections with every lesson (nothing is locked,
 * so each row is a link), and for teachers and reviewers every lesson's
 * teacher guide and the whole course on paper. There are no section checks
 * or certificates yet, and the page says so.
 */
export function CourseMapPage() {
  return (
    <DigitalWorldFrame>
      <CourseMap />
    </DigitalWorldFrame>
  );
}

function CourseMap() {
  const { t, tx, contentLang } = useI18n();
  const course = digitalWorld.getCourse();
  usePageTitle(course.course.title);
  const session = useLearnerSession();
  const learnerId = session.activeLearner?.id ?? null;
  const progressResult = useLearnerProgress(learnerId);
  const { hash } = useLocation();
  const ourWorld = useOurWorldName();
  const loading = session.status === 'loading' || (learnerId !== null && progressResult.status === 'loading');

  const sections = digitalWorld.getSections();
  const lessons = digitalWorld.getLessons();
  const lookingAround = session.lookAround;
  const isGuest = lookingAround || !session.activeLearner;
  const progress = progressResult.progress;
  const highlight = isGuest ? undefined : findContinueTarget(lessons, progress)?.lesson.id;

  let minMinutes = Infinity;
  let maxMinutes = 0;
  for (const lesson of lessons) {
    minMinutes = Math.min(minMinutes, lesson.estimatedMinutes[0]);
    maxMinutes = Math.max(maxMinutes, lesson.estimatedMinutes[1]);
  }

  // A link to one section (/course/digital-world#check-what-you-see) scrolls to it once the page is there.
  useEffect(() => {
    if (loading) return undefined;
    const id = hash.slice(1);
    if (!id || !sections.some((section) => section.id === id)) return undefined;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [loading, hash, sections]);

  if (loading) return null;

  return (
    <div className="tw-course-page tw-dw-map">
      <CourseChoice ourWorld={ourWorld} current={COURSE_ID} />
      <header className="tw-course-intro">
        <span className="eyebrow">{t('pages.course.eyebrow')}</span>
        <h1 className="h1" tabIndex={-1} {...contentLang}>
          {course.course.title}
        </h1>
        <p className="body-lg" {...contentLang}>
          {course.course.description}
        </p>
        <div className="tw-course-badges">
          <Badge tone="outline" icon="BookOpen">
            {t('pages.course.lessonsBadge', { count: lessons.length })}
          </Badge>
          <Badge tone="outline" icon="Clock">
            {t('pages.course.timeBadge', { min: minMinutes, max: maxMinutes })}
          </Badge>
        </div>
        {isGuest ? <p className="small tw-course-guest-note">{t(lookingAround ? 'pages.course.guestNote' : 'pages.course.noLearnerNote')}</p> : null}
        <p className="small tw-course-guest-note">{t('digitalWorld.map.noChecks')}</p>
      </header>

      <div className="tw-course-sections">
        {sections.map((section) => (
          <MapSection
            key={section.id}
            section={section}
            lessons={digitalWorld.getSectionLessons(section.id)}
            progress={lookingAround ? new Map() : progress}
            hideProgress={lookingAround}
            highlight={highlight}
          />
        ))}
      </div>

      <section className="tw-dw-reviewers" aria-labelledby="tw-dw-reviewers-title">
        <h2 id="tw-dw-reviewers-title" className="h2">
          {t('digitalWorld.map.forTeachersTitle')}
        </h2>
        <p className="body">{t('digitalWorld.map.forTeachersBody')}</p>
        <div className="tw-dw-actions">
          <Button variant="secondary" icon="Printer" href={COURSE_PRINT_PATH}>
            {t('digitalWorld.map.printAll')}
          </Button>
        </div>
        <ul className="tw-dw-guides" role="list">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link to={teacherGuidePath(lesson.id)} className="tw-dw-guide-link">
                {tx('digitalWorld.map.guideLink', { number: lesson.number, title: <En>{lesson.title}</En> })}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

interface MapSectionProps {
  section: CourseSection;
  lessons: readonly CourseLesson[];
  progress: ProgressByLessonId;
  hideProgress: boolean;
  highlight: string | undefined;
}

/** One section: its header in its tint and icon, then every lesson. No section check row: none is drafted yet. */
function MapSection({ section, lessons, progress, hideProgress, highlight }: MapSectionProps) {
  const { t } = useI18n();
  const look = digitalWorld.sectionLook(section.id);
  const { completed, total } = sectionProgress(section, lessons, progress);
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className="tw-course-section">
      <SectionHeader
        titleId={`${section.id}-title`}
        section={look.tone}
        icon={look.icon}
        number={section.number}
        title={section.title}
        question={section.question}
        completed={hideProgress ? undefined : completed}
        total={hideProgress ? undefined : total}
      />
      <div className="tw-course-section-body">
        {lessons.map((lesson) => {
          const record = progress.get(lesson.id);
          const done = isLessonComplete(record);
          const [min, max] = lesson.estimatedMinutes;
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
              highlight={lesson.id === highlight}
              href={lessonPath(lesson.id, done ? 'read' : nextStageForLesson(record))}
            />
          );
        })}
      </div>
    </section>
  );
}
