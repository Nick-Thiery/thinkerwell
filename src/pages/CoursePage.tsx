import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { PreviewCourses } from '../app/PreviewCourses';
import { useFullPageTitle } from '../app/usePageTitle';
import { Badge, Icon } from '../components/ds';
import { useCatalog } from '../content/useCatalog';
import { useI18n } from '../i18n';
import { useLearnerProgress, useLearnerSession } from '../session';
import { findContinueTarget, sectionProgress, type SectionProgress } from '../storage';
import './CoursePage.css';
import { SectionCard } from './course/SectionCard';
import { SectionChips } from './course/SectionChips';
import { SectionsSidebar } from './course/SectionsSidebar';

/**
 * The course map (docs/screens/Course.dc.html, docs/screens/PhoneCourse.dc.html):
 * the 4 sections, each with its lessons and section check. Nothing is ever
 * locked, so every row is a real link regardless of progress.
 */
export function CoursePage() {
  const { t, contentLang } = useI18n();
  const session = useLearnerSession();
  const learnerId = session.activeLearner?.id ?? null;
  const progressResult = useLearnerProgress(learnerId);
  const location = useLocation();
  const catalog = useCatalog();
  const course = catalog.getCourse();
  const title = course.course.title;
  useFullPageTitle(t('seo.course.title'));

  // Home, the dashboard and the course map render nothing with a heading
  // while their data is still loading: AppLayout waits for the first h1
  // and would otherwise move focus to a placeholder that then gets replaced.
  const loading = session.status === 'loading' || (learnerId !== null && progressResult.status === 'loading');

  const sections = catalog.getSections();
  const lessons = catalog.getLessons();
  const progress = progressResult.progress;
  // Looking around (chosen from the picker, ?preview=true, or forced by a
  // missing IndexedDB) never has any progress to show, by design — nothing
  // written for that visit is ever read back. Nobody having been chosen yet
  // is different: there is simply no one's progress to read, and the wording
  // below reflects that (CLAUDE.md rule 4: shared devices, separate work).
  const lookingAround = session.lookAround;
  const noLearnerChosen = !lookingAround && !session.activeLearner;
  const isGuest = lookingAround || noLearnerChosen;
  const continueTarget = isGuest ? undefined : findContinueTarget(lessons, progress);
  // Looking around claims "progress isn't shown": hiding the counts and
  // rings (not only never marking a lesson done) keeps that claim honest,
  // rather than showing every section and lesson at a truthful-but-confusing 0.
  const hideProgress = lookingAround;

  const progressBySection = new Map<string, SectionProgress>(
    sections.map((section) => [section.id, sectionProgress(section, lessons, progress)]),
  );

  const currentSectionId = continueTarget ? catalog.getLessonSection(continueTarget.lesson).id : (sections[0]?.id ?? undefined);

  // Only the section holding the learner's next step opens by default; every
  // other section collapses to a one-line summary (docs/screens/Course.dc.html).
  // A guest sees the first section open. Once a learner opens or closes a
  // section by hand it stays that way for the rest of this visit.
  //
  // This can only be worked out once progress has actually finished loading
  // from IndexedDB: `currentSectionId` is Section 1 for every learner until
  // then, because `progress` is still an empty map on that very first
  // render. Deciding it in useState's initializer, as this used to, freezes
  // that wrong answer forever — it runs once, on that first render, and
  // nothing ever asks it again. Working it out here instead, from an effect
  // keyed on the loading learner, re-runs once real progress is in
  // (r2-browser-1 / r2-checks-1 / r2-spec-1), including after switching
  // learners while already on this page.
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(() => new Set());
  const openedDefaultsForRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const key = learnerId ?? 'guest';
    if (openedDefaultsForRef.current === key) return;
    openedDefaultsForRef.current = key;
    setOpenSections(new Set(currentSectionId ? [currentSectionId] : []));
  }, [loading, learnerId, currentSectionId]);

  // A link to one specific section — the dashboard's own section rows point
  // at /course#history and so on — opens that section and scrolls it into
  // view once the page has actually loaded. Plain react-router
  // ScrollRestoration can't do either on its own: the section isn't in the
  // DOM yet on the navigation that's supposed to land on it (this page
  // renders nothing while loading), and it would be collapsed even once it
  // is (r2-spec-3).
  useEffect(() => {
    if (loading) return;
    const id = location.hash.slice(1);
    if (!id || !sections.some((section) => section.id === id)) return;
    // Syncing open sections from the URL's own hash, an external input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenSections((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    // Let the newly-expanded section lay out before scrolling to it.
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
    // `sections` is the course's fixed, module-level list: only an actual
    // hash or load-state change should re-run this.
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

  // Cheap enough (24 lessons) to work out on every render rather than
  // memoize: `lessons` is a stable module-level array, but nothing here can
  // prove that to the compiler, and there's nothing worth memoizing anyway.
  let minMinutes = 0;
  let maxMinutes = 0;
  for (const [i, lesson] of lessons.entries()) {
    minMinutes = i === 0 ? lesson.estimatedMinutes[0] : Math.min(minMinutes, lesson.estimatedMinutes[0]);
    maxMinutes = Math.max(maxMinutes, lesson.estimatedMinutes[1]);
  }

  if (loading) return null;

  return (
    <div className="tw-course-page">
      <PreviewCourses current="our-world" />
      <header className="tw-course-intro">
        <span className="eyebrow">{t('pages.course.eyebrow')}</span>
        <h1 className="h1" tabIndex={-1} {...contentLang}>
          {title}
        </h1>
        <p className="body-lg" {...contentLang}>
          {course.course.description}
        </p>
        <div className="tw-course-badges">
          <Badge tone="outline" icon="BookOpen">
            {t('pages.course.lessonsBadge', { count: course.course.totalLessons })}
          </Badge>
          <Badge tone="outline" icon="ClipboardCheck">
            {t('pages.course.checksBadge', { count: sections.length })}
          </Badge>
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
      <SectionChips sections={sections} currentSectionId={isGuest ? undefined : currentSectionId} />
      <div className="tw-course-body">
        <SectionsSidebar sections={sections} progressBySection={progressBySection} currentSectionId={isGuest ? undefined : currentSectionId} hideProgress={hideProgress} />
        <div className="tw-course-sections">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              lessons={catalog.getSectionLessons(section.id)}
              progress={progress}
              highlightLessonId={continueTarget?.lesson.id}
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
