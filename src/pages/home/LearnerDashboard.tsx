import { createElement } from 'react';
import { sectionCheckPath, lessonPath } from '../../app/lessonUrls';
import { getLessonSection, getLessons, getSections } from '../../content';
import { Badge, Button, ContinueCard, Icon, ProgressRing, SectionBadge, useDsLinkComponent } from '../../components/ds';
import { useI18n } from '../../i18n';
import { SECTION_ICONS } from '../course/sectionIcons';
import {
  findContinueTarget,
  latestJournalEntry,
  sectionProgress,
  stagesDoneForLesson,
  totalLessonsCompleted,
  type Learner,
  type ProgressByLessonId,
} from '../../storage';

/**
 * A section check is judged "ready" the moment its lessons are all done. This
 * project doesn't yet have quiz content (content/quizzes/*.json is phase 7),
 * so the question count shown here is a placeholder matching Dashboard.dc.html
 * until that content exists (see openIssues in the phase-3 report).
 */
const PLACEHOLDER_QUESTION_COUNT = 10;

export interface LearnerDashboardProps {
  learner: Learner;
  progress: ProgressByLessonId;
}

/** The learner home (Dashboard.dc.html): greeting, continue card, progress by section. */
export function LearnerDashboard({ learner, progress }: LearnerDashboardProps) {
  const { t } = useI18n();
  const LinkTag = useDsLinkComponent();
  const lessons = getLessons();
  const sections = getSections();
  const target = findContinueTarget(lessons, progress);
  const completedCount = totalLessonsCompleted(lessons, progress);
  const currentSectionId = target ? getLessonSection(target.lesson).id : undefined;
  const journalEntry = latestJournalEntry(lessons, progress);
  const isNewLearner = completedCount === 0 && progress.size === 0;

  const summary = !target
    ? t('pages.home.dashboard.summaryDone')
    : completedCount === 0
      ? t('pages.home.dashboard.summaryNone', { number: target.lesson.number })
      : t('pages.home.dashboard.summaryInProgress', { count: completedCount, number: target.lesson.number });

  const readySection = sections.find((section) => {
    const { completed, total } = sectionProgress(section, lessons, progress);
    return completed === total && total > 0;
  });

  return (
    <div className="tw-dash">
      <div className="tw-dash-head">
        <div className="tw-dash-greeting">
          <h1 className="h1" tabIndex={-1}>
            {t('pages.home.dashboard.greeting', { name: learner.name })}
          </h1>
          <p className="body-lg">{summary}</p>
        </div>
        <div className="tw-dash-badges">
          {/* Phase 6 adds an offline-status badge here, alongside this one. */}
          <Badge tone="outline" icon="Lock">
            {t('pages.home.dashboard.savedBadge')}
          </Badge>
        </div>
      </div>

      {target ? (
        <ContinueCard
          title={target.lesson.title}
          eyebrow={t(isNewLearner ? 'pages.home.dashboard.startHere' : 'pages.home.dashboard.continueEyebrow')}
          lessonLabel={t('pages.course.lessonLabel', { number: target.lesson.number, section: getLessonSection(target.lesson).title })}
          done={stagesDoneForLesson(progress.get(target.lesson.id))}
          current={target.stage}
          stageLabel={t('lesson.nextStep', { stage: t(`stages.${target.stage}`) })}
          cta={isNewLearner ? t('pages.home.dashboard.startCta') : undefined}
          href={lessonPath(target.lesson.id, target.stage)}
        />
      ) : (
        <section className="tw-dash-finished">
          <h2 className="h2">{t('pages.home.dashboard.finishedTitle')}</h2>
          <p className="body-lg">{t('pages.home.dashboard.finishedBody')}</p>
          <Button variant="primary" size="lg" href="/course">
            {t('pages.home.dashboard.finishedCta')}
          </Button>
        </section>
      )}

      <div className="tw-dash-grid">
        <section aria-labelledby="dash-course-title" className="tw-dash-sections">
          <div className="tw-dash-sections-head">
            <h2 id="dash-course-title" className="h2">
              {t('pages.home.dashboard.yourCourse')}
            </h2>
            <Button variant="ghost" href="/course">
              {t('pages.home.dashboard.seeAll', { count: lessons.length })}
            </Button>
          </div>
          {sections.map((section) => {
            const { completed, total } = sectionProgress(section, lessons, progress);
            const isHere = section.id === currentSectionId && completed < total;
            // Not <Button>: it wraps every child in one inner <span> (fine for
            // an icon plus a text label, its usual case), which would collapse
            // this row's three independent parts — the badge, the status text
            // and the ring — into plain inline flow instead of the flex row
            // ".tw-section-row" below expects. Rendered directly with the
            // "tw-btn" class for the same sizing, plus its own border colour
            // (an ink border only for "You are here" — CLAUDE.md's lemon/ink
            // rule keeps every other row to the plain line colour).
            return createElement(
              LinkTag,
              {
                key: section.id,
                href: `/course#${section.id}`,
                className: `tw-btn tw-section-row${isHere ? ' tw-section-row-current' : ''}`,
              },
              <SectionBadge key="badge" section={section.id} number={section.number} name={section.title} className="tw-section-row-badge" />,
              <span key="status" className="body tw-section-row-status">
                {isHere ? t('pages.home.dashboard.youAreHere') : t('pages.home.dashboard.lessonsOf', { completed, total })}
              </span>,
              <ProgressRing key="ring" value={completed} max={total} />,
            );
          })}
        </section>
        <aside className="tw-dash-aside">
          {readySection ? (
            <section aria-labelledby="dash-check-title" className="tw-check-card" style={{ background: `var(--sec-${readySection.id})` }}>
              <span className="eyebrow tw-check-card-eyebrow" style={{ color: `var(--sec-${readySection.id}-ink)` }}>
                <Icon name="ClipboardCheck" size={18} />
                {t('pages.home.dashboard.sectionCheckReady')}
              </span>
              <h3 id="dash-check-title" className="h3 tw-check-card-title">
                <Icon name={SECTION_ICONS[readySection.id]} size={20} />
                {readySection.title}
              </h3>
              <p className="body">
                {t('pages.home.dashboard.sectionCheckBody', {
                  count: readySection.lessons.length,
                  questions: PLACEHOLDER_QUESTION_COUNT,
                })}
              </p>
              <Button variant="secondary" href={sectionCheckPath(readySection.id)}>
                {t('pages.home.dashboard.startCheck')}
              </Button>
            </section>
          ) : null}
          <section aria-labelledby="dash-journal-title" className="tw-journal-card">
            <h3 id="dash-journal-title" className="h3">
              {t('pages.home.dashboard.fromJournal')}
            </h3>
            {journalEntry ? (
              <>
                <p className="small tw-journal-meta">{t('pages.home.dashboard.latestEntry', { stage: t(`stages.${journalEntry.stage}`), number: journalEntry.lessonNumber })}</p>
                <p className="body tw-journal-snippet">{journalEntry.text.length > 160 ? `${journalEntry.text.slice(0, 160)}…` : journalEntry.text}</p>
              </>
            ) : (
              <p className="body">{t('pages.home.dashboard.noJournalYet')}</p>
            )}
            <Button variant="ghost" href="/journal">
              {t('pages.home.dashboard.openJournal')}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
