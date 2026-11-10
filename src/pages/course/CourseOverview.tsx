import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CourseChoice } from '../../app/CourseChoice';
import { Badge, Icon } from '../../components/ds';
import type { StageId } from '../../content/stages';
import { useI18n } from '../../i18n';
import { useLearnerProgress, useLearnerSession } from '../../session';
import { findContinueTarget, sectionProgress, type SectionProgress } from '../../storage';
import '../CoursePage.css';
import type { OverviewLesson, OverviewSection, SectionLook } from './overviewTypes';
import { SectionCard } from './SectionCard';
import { SectionChips } from './SectionChips';
import { SectionsSidebar } from './SectionsSidebar';

export interface CourseOverviewProps {
  /** Its id in src/content/courses.ts, for the course choice and old links. */
  courseId: string;
  title: string;
  description: string;
  sections: readonly OverviewSection[];
  lessons: readonly OverviewLesson[];
  /** A section's lessons, in order. */
  sectionLessons: (sectionId: string) => readonly OverviewLesson[];
  /** A section's tint and icon; Our World's own ids by default. */
  looks?: (sectionId: string) => SectionLook;
  /** A lesson's steps; Our World's catalog by default. */
  stagesFor?: (lesson: OverviewLesson) => readonly StageId[];
  /** Where a section's check is, or null when it has none; Our World's by default. */
  checkPathFor?: (sectionId: string) => string | null;
  /** How many sections have a check (the badge is left out at 0). */
  checkCount: number;
  /** True when a finished section offers a certificate (Our World's only). */
  certificates: boolean;
}

/**
 * A course's overview (docs/screens/Course.dc.html, docs/screens/PhoneCourse.dc.html),
 * the same for every course (Justin's brief of 10 November 2026: every course front
 * page follows Exploring Our World's): the course choice, its title, description and
 * badges, a Sections list on the left (section chips on a phone) and a panel for each
 * section with its lessons. Nothing is ever locked, so every row is a real link.
 */
export function CourseOverview({
  courseId,
  title,
  description,
  sections,
  lessons,
  sectionLessons,
  looks,
  stagesFor,
  checkPathFor,
  checkCount,
  certificates,
}: CourseOverviewProps) {
  const { t, contentLang } = useI18n();
  const session = useLearnerSession();
  const learnerId = session.activeLearner?.id ?? null;
  const progressResult = useLearnerProgress(learnerId);
  const location = useLocation();
  const navigate = useNavigate();

  // The course renders nothing with a heading while its data is still loading:
  // AppLayout waits for the first h1 and would otherwise move focus to a
  // placeholder that then gets replaced.
  const loading = session.status === 'loading' || (learnerId !== null && progressResult.status === 'loading');

  const progress = progressResult.progress;
  // Looking around (chosen from the picker, ?preview=true, or forced by a
  // missing IndexedDB) never has any progress to show, by design — nothing
  // written for that visit is ever read back. Nobody having been chosen yet
  // is different: there is simply no one's progress to read, and the wording
  // below reflects that (CLAUDE.md rule 4: shared devices, separate work).
  const lookingAround = session.lookAround;
  const noLearnerChosen = !lookingAround && !session.activeLearner;
  const isGuest = lookingAround || noLearnerChosen;
  const continueLesson = isGuest ? undefined : findContinueTarget(lessons, progress)?.lesson;
  // Looking around claims "progress isn't shown": hiding the counts and
  // rings (not only never marking a lesson done) keeps that claim honest,
  // rather than showing every section and lesson at a truthful-but-confusing 0.
  const hideProgress = lookingAround;

  const progressBySection = new Map<string, SectionProgress>(sections.map((section) => [section.id, sectionProgress(section, lessons, progress)]));
  const currentSectionId = continueLesson ? continueLesson.section : (sections[0]?.id ?? undefined);

  // Only the section holding the learner's next step opens by default; every
  // other section collapses to a one-line summary. A guest sees the first
  // section open. Once a learner opens or closes a section by hand it stays
  // that way for the rest of this visit. This is this course's own: another
  // course's overview keeps its own sections' state.
  //
  // It can only be worked out once progress has finished loading from
  // IndexedDB: `currentSectionId` is the first section for every learner until
  // then. Deciding it in useState's initializer would freeze that wrong answer
  // forever, so it is worked out here, from an effect keyed on the loading
  // learner, which re-runs once real progress is in, including after switching
  // learners while already on this page (r2-browser-1 / r2-checks-1 / r2-spec-1).
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(() => new Set());
  const openedDefaultsForRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const key = learnerId ?? 'guest';
    if (openedDefaultsForRef.current === key) return;
    openedDefaultsForRef.current = key;
    setOpenSections(new Set(currentSectionId ? [currentSectionId] : []));
  }, [loading, learnerId, currentSectionId]);

  // A link to one specific section (/course/digital-world#who-builds-ai, the
  // learner home's rows, a lesson's way back) opens that section and scrolls
  // it into view once the page has actually loaded. Plain react-router
  // ScrollRestoration can't do either on its own: the section isn't in the DOM
  // yet on the navigation that's supposed to land on it (this page renders
  // nothing while loading), and it would be collapsed even once it is (r2-spec-3).
  useEffect(() => {
    if (loading) return;
    const id = location.hash.slice(1);
    // An old link to a preview course's teacher guides at the end of its page: they are
    // in the educators' list now, at this course (Justin's brief, section 10).
    if (id === 'teacher-guides' && courseId !== 'our-world') {
      void navigate(`/educators/guides#${courseId}`, { replace: true });
      return;
    }
    if (!id || !sections.some((section) => section.id === id)) return;
    // Syncing open sections from the URL's own hash, an external input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenSections((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    // Let the newly-expanded section lay out before scrolling to it.
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
    // `sections` is the course's fixed list: only an actual hash or load-state change should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.hash]);

  function toggleSection(id: string): void {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  let minMinutes = 0;
  let maxMinutes = 0;
  for (const [i, lesson] of lessons.entries()) {
    minMinutes = i === 0 ? lesson.estimatedMinutes[0] : Math.min(minMinutes, lesson.estimatedMinutes[0]);
    maxMinutes = Math.max(maxMinutes, lesson.estimatedMinutes[1]);
  }

  if (loading) return null;

  return (
    <div className="tw-course-page">
      <CourseChoice current={courseId} />
      <header className="tw-course-intro">
        <span className="eyebrow">{t('pages.course.eyebrow')}</span>
        <h1 className="h1" tabIndex={-1} {...contentLang}>
          {title}
        </h1>
        <p className="body-lg" {...contentLang}>
          {description}
        </p>
        <div className="tw-course-badges">
          <Badge tone="outline" icon="BookOpen">
            {t('pages.course.lessonsBadge', { count: lessons.length })}
          </Badge>
          {checkCount > 0 ? (
            <Badge tone="outline" icon="ClipboardCheck">
              {t('pages.course.checksBadge', { count: checkCount })}
            </Badge>
          ) : null}
          <Badge tone="outline" icon="Clock">
            {t('pages.course.timeBadge', { min: minMinutes, max: maxMinutes })}
          </Badge>
        </div>
        {isGuest ? (
          <p className="small tw-course-guest-note">{t(lookingAround ? 'pages.course.guestNote' : 'pages.course.noLearnerNote')}</p>
        ) : null}
        <p className="small tw-course-nothing-locked-mobile">
          <Icon name="Info" size={16} />
          {t('pages.course.nothingLocked')}
        </p>
      </header>
      <SectionChips sections={sections} looks={looks} currentSectionId={isGuest ? undefined : currentSectionId} />
      <div className="tw-course-body">
        <SectionsSidebar
          sections={sections}
          looks={looks}
          progressBySection={progressBySection}
          currentSectionId={isGuest ? undefined : currentSectionId}
          hideProgress={hideProgress}
        />
        <div className="tw-course-sections">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              lessons={sectionLessons(section.id)}
              look={looks?.(section.id)}
              stagesFor={stagesFor}
              checkPath={checkPathFor ? checkPathFor(section.id) : undefined}
              certificates={certificates}
              progress={progress}
              highlightLessonId={continueLesson?.id}
              hideProgress={hideProgress}
              expanded={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
