import { useMemo } from 'react';
import { courseCertificatePath, lessonPath, sectionCertificatePath, sectionCheckPath } from '../../../app/lessonUrls';
import { Badge, Button, Icon, LessonRow, Mascot, SectionBadge, StagePath } from '../../../components/ds';
import {
  STAGES,
  type CourseLesson,
  type CourseSection,
  type StageId,
} from '../../../content';
import { useLessonContent } from '../../../content/useContent';
import { En, translate, useI18n } from '../../../i18n';
import { hasText, LESSON_PHONE_QUERY, useLessonPlayer, useMediaQuery } from '../../../lesson';
import { useLearnerProgress, useLearnerSession } from '../../../session';
import {
  finishedSetWith,
  isLessonComplete,
  nextStageForLesson,
  sectionProgress,
  stagesDoneForLesson,
  type LessonProgress,
  type ProgressByLessonId,
} from '../../../storage';
import './CompleteStage.css';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/**
 * The completion message without its first sentence when that sentence is
 * the page's own h1 in English ("You finished Lesson 10."), so it isn't said
 * twice. Every lesson follows that pattern today; any other message shows
 * whole. The message is course text, in the lessons' language, so
 * `heading` is the h1 in that language: English whatever the interface's
 * language, or the interface's own when the lessons are translated too.
 */
export function completionSummary(message: string, heading: string): string {
  const trimmed = message.trim();
  return trimmed.startsWith(heading) ? trimmed.slice(heading.length).trim() : trimmed;
}

/** The first stage not done yet, for the "partway" view. Reflect if every stage has a tick but the lesson has no completion date. */
export function firstUnfinishedStage(done: readonly StageId[]): StageId {
  return STAGES.find((stage) => !done.includes(stage)) ?? 'reflect';
}

/**
 * /lesson/:id/complete (docs/screens/LessonComplete.dc.html). Owns the
 * page's single h1: the shell renders only this (plus its banners) here.
 *
 * Who sees what (nothing is ever locked, so anyone can open this by URL):
 * - A learner who has finished the lesson (completedAt set, which Reflect's
 *   "Finish lesson" does just before coming here): "You finished Lesson N.",
 *   the completion message, the section count and what's up next.
 * - A learner who opens it before finishing: "You're partway through
 *   Lesson N." with an honest step count and a link to the first step not
 *   done yet. No completion is claimed.
 * - Guests (look-around, or nobody chosen): the same two views, decided by
 *   what they did on this visit (kept in memory only), always with a note
 *   that nothing was saved and how to choose a learner. A guest who opens
 *   this by URL without finishing is never told they finished.
 * - When this lesson's finish is the one that completed its section (or all
 *   24 lessons), a learner also sees that, with a link to the certificate
 *   (docs/notes/certificates.md). Guests have no saved work, so never.
 */
export function CompleteStage() {
  const { t, tx, contentLang, content: translated } = useI18n();
  const content = useLessonContent();
  const { lesson, section, progress, mode, saving } = useLessonPlayer();
  const session = useLearnerSession();
  const phone = useMediaQuery(LESSON_PHONE_QUERY);

  const learnerId = mode === 'learner' ? (session.activeLearner?.id ?? null) : null;
  const loaded = useLearnerProgress(learnerId);

  // This lesson's progress comes from the player, which already has the
  // just-finished save applied; the stored copy may land a moment later.
  const allProgress = useMemo<ProgressByLessonId>(() => {
    if (!learnerId) return loaded.progress;
    const map = new Map<string, LessonProgress>(loaded.progress);
    map.set(lesson.id, progress);
    return map;
  }, [learnerId, loaded.progress, lesson.id, progress]);

  const finished = isLessonComplete(progress);
  const heading = t('lessonPlayer.complete.title', { number: lesson.number });

  // Only a learner's saved work earns a certificate, and only once it is all read.
  // A course without section checks has no certificates yet (a preview course).
  const canOffer = finished && learnerId !== null && loaded.status === 'ready' && content.hasSectionChecks;
  const finishedSection = canOffer && finishedSetWith(lesson, content.getSectionLessons(section.id), allProgress);
  const finishedCourse = canOffer && finishedSetWith(lesson, content.getLessons(), allProgress);

  const counts = sectionProgress(section, content.getLessons(), allProgress);
  const sectionTitle = <En>{section.title}</En>;
  const badgeText =
    learnerId && loaded.status === 'ready'
      ? tx('lessonPlayer.complete.badgeProgress', {
          // The section's tint always sits beside its icon and name (README).
          title: sectionTitle,
          completed: counts.completed,
          count: counts.total,
        })
      : tx('lessonPlayer.complete.badgeSection', { number: section.number, title: sectionTitle });

  const look = content.sectionLook(section.id);
  const titleNode = <strong {...contentLang}>{lesson.title}</strong>;
  const nextStage = firstUnfinishedStage(progress.stagesDone);
  const summaryMessage = finished ? (
    <En>{completionSummary(lesson.reflect.completionMessage, translated ? t('lessonPlayer.complete.title', { number: lesson.number }) : translate('en', 'lessonPlayer.complete.title', { number: lesson.number }))}</En>
  ) : (
    t('lessonPlayer.complete.partwayBody', { done: progress.stagesDone.length, total: STAGES.length })
  );

  const wroteSomething = hasText(progress.writing.text);
  const reflected = Object.values(progress.reflections).some((text) => hasText(text));
  const savedNote = saving
    ? wroteSomething && reflected
      ? t('lessonPlayer.complete.savedBoth')
      : wroteSomething
        ? t('lessonPlayer.complete.savedWriting')
        : reflected
          ? t('lessonPlayer.complete.savedReflection')
          : null
    : t('lessonPlayer.complete.guestNote');

  return (
    <section className="tw-complete" aria-labelledby="tw-complete-title">
      <div className="tw-complete-panel">
        <Mascot src={MASCOT_SRC} size={phone ? 120 : 160} />
        <Badge tone={look.tone} icon={look.icon}>
          {badgeText}
        </Badge>
      </div>

      <div className="tw-complete-body">
        <div className="tw-complete-heading">
          <span className="eyebrow tw-complete-eyebrow">
            {finished
              ? t('lessonPlayer.complete.eyebrow', { number: lesson.number })
              : t('lessonPlayer.complete.partwayEyebrow', { number: lesson.number })}
          </span>
          <h1 id="tw-complete-title" className="tw-complete-title" tabIndex={-1}>
            {finished ? heading : t('lessonPlayer.complete.partwayTitle', { number: lesson.number })}
          </h1>
          <p className="tw-complete-summary">
            {tx('lessonPlayer.complete.summary', { title: titleNode, message: summaryMessage })}
          </p>
        </div>

        {finishedSection || finishedCourse ? (
          <CertificateOffer section={section} finishedSection={finishedSection} finishedCourse={finishedCourse} />
        ) : null}

        <div className="tw-complete-path">
          {/* Icons only on phones, as in the lesson itself; each step keeps its name as its label. */}
          <StagePath compact={phone} done={progress.stagesDone} hrefFor={(stage) => lessonPath(lesson.id, stage)} />
        </div>

        {finished ? null : (
          <div className="tw-complete-actions">
            <Button variant="primary" iconRight="ArrowRight" href={lessonPath(lesson.id, nextStage)}>
              {t('lessonPlayer.complete.partwayCta', { stage: t(`stages.${nextStage}`) })}
            </Button>
          </div>
        )}

        {savedNote ? (
          <p className="tw-complete-note">
            <Icon name={saving ? 'NotebookPen' : 'Info'} size={18} />
            <span>{savedNote}</span>
          </p>
        ) : null}

        <UpNext lesson={lesson} progress={learnerId ? allProgress : undefined} highlightFirst={finished} />

        <div className="tw-complete-actions">
          <Button variant="secondary" icon="ArrowLeft" href={content.coursePath(section.id)}>
            {t('lessonPlayer.complete.backToCourse')}
          </Button>
          <Button variant="ghost" icon="NotebookPen" href="/journal">
            {t('lessonPlayer.complete.openJournal')}
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * The moment a finish completes a section, or the whole course: a short
 * note with a link to the certificate. For the course, the section's own
 * certificate is linked too (the last lesson always finishes a section).
 * The section's tint sits only in its disc, beside its icon and its name.
 */
function CertificateOffer({
  section,
  finishedSection,
  finishedCourse,
}: {
  section: CourseSection;
  finishedSection: boolean;
  finishedCourse: boolean;
}) {
  const { t, tx } = useI18n();
  const content = useLessonContent();
  return (
    <section className="tw-complete-cert" aria-labelledby="tw-complete-cert-title">
      {finishedCourse ? (
        <span className="tw-complete-cert-icon">
          <Icon name="Award" size={26} />
        </span>
      ) : (
        <SectionBadge section={content.sectionLook(section.id).tone} showName={false} />
      )}
      <div className="tw-complete-cert-body">
        <h2 id="tw-complete-cert-title" className="h3">
          {finishedCourse
            ? t('certificates.offer.courseTitle', { count: content.getLessons().length })
            : tx('certificates.offer.sectionTitle', { section: <En>{section.title}</En> })}
        </h2>
        <p>{t(finishedCourse ? 'certificates.offer.courseBody' : 'certificates.offer.sectionBody')}</p>
        <div className="tw-complete-cert-actions">
          <Button variant="secondary" icon="Award" href={finishedCourse ? courseCertificatePath() : sectionCertificatePath(section.id)}>
            {t(finishedCourse ? 'certificates.offer.getCourseCertificate' : 'certificates.offer.getCertificate')}
          </Button>
          {finishedCourse && finishedSection ? (
            <Button variant="ghost" href={sectionCertificatePath(section.id)}>
              {t('certificates.offer.getSectionCertificate')}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * "Up next": the section check first when this is the section's last
 * lesson, then the next lesson in course order (none after Lesson 24).
 * The first row carries the screen's one lemon highlight, but only on the
 * completion view; the partway view's lead is its own "Go to" button. The
 * next lesson's stage dots get no lemon "current" dot for the same reason.
 */
function UpNext({
  lesson,
  progress,
  highlightFirst,
}: {
  lesson: CourseLesson;
  /** The learner's progress, or undefined for guests (rows show "Start"). */
  progress: ProgressByLessonId | undefined;
  highlightFirst: boolean;
}) {
  const { t, tx } = useI18n();
  const { section } = useLessonPlayer();
  const content = useLessonContent();
  // A course without section checks (a preview course) offers the next lesson only.
  const showCheck = content.hasSectionChecks && content.isLastLessonInSection(lesson);
  const next = content.getNextLesson(lesson.id);
  if (!showCheck && !next) return null;

  const record = next ? progress?.get(next.id) : undefined;
  const nextDone = isLessonComplete(record);
  const nextInProgress = Boolean(record) && !nextDone;
  const first = section.lessons[0];
  const last = section.lessons[section.lessons.length - 1];

  return (
    <div className="tw-complete-next">
      <h2 className="eyebrow tw-complete-eyebrow">{t('lessonPlayer.complete.upNext')}</h2>
      {showCheck ? (
        <LessonRow
          kind="quiz"
          title={t('lessonPlayer.complete.sectionCheckTitle', { title: section.title })}
          displayTitle={tx('lessonPlayer.complete.sectionCheckTitle', { title: <En>{section.title}</En> })}
          question={t('lessonPlayer.complete.sectionCheckQuestion', { first: first ?? '', last: last ?? '' })}
          href={sectionCheckPath(section.id)}
          highlight={highlightFirst}
        />
      ) : null}
      {next ? (
        <LessonRow
          number={next.number}
          title={next.title}
          question={next.essentialQuestion}
          time={t('lesson.minutes', { min: next.estimatedMinutes[0], max: next.estimatedMinutes[1] })}
          status={nextDone ? 'completed' : nextInProgress ? 'in-progress' : 'not-started'}
          done={stagesDoneForLesson(record)}
          highlight={highlightFirst && !showCheck}
          href={lessonPath(next.id, nextInProgress ? nextStageForLesson(record) : 'read')}
        />
      ) : null}
    </div>
  );
}
