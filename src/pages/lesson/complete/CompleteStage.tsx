import { Fragment, useMemo, type ReactNode } from 'react';
import { lessonPath, sectionCheckPath } from '../../../app/lessonUrls';
import { Badge, Button, Icon, LessonRow, Mascot, StagePath } from '../../../components/ds';
import {
  getLessons,
  getNextLesson,
  isLastLessonInSection,
  STAGES,
  type Lesson,
  type StageId,
} from '../../../content';
import { useI18n } from '../../../i18n';
import { hasText, LESSON_PHONE_QUERY, useLessonPlayer, useMediaQuery } from '../../../lesson';
import { useLearnerProgress, useLearnerSession } from '../../../session';
import {
  isLessonComplete,
  nextStageForLesson,
  sectionProgress,
  stagesDoneForLesson,
  type LessonProgress,
  type ProgressByLessonId,
} from '../../../storage';
import { SECTION_ICONS } from '../../course/sectionIcons';
import './CompleteStage.css';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/** A marker that can't appear in a message, used to put a React node inside translated text. */
const SLOT = '\u0000';

/** Renders `text` with each SLOT replaced by `node` (keeps word order in the translation's hands). */
function withSlot(text: string, node: ReactNode): ReactNode {
  const parts = text.split(SLOT);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? node : null}
      {part}
    </Fragment>
  ));
}

/**
 * The completion message without its first sentence when that sentence is
 * the page's own h1 ("You finished Lesson 10."), so it isn't said twice.
 * Every lesson follows that pattern today; any other message shows whole.
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
 */
export function CompleteStage() {
  const { t } = useI18n();
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

  const counts = sectionProgress(section, getLessons(), allProgress);
  const badgeText =
    learnerId && loaded.status === 'ready'
      ? t('lessonPlayer.complete.badgeProgress', {
          // The section's tint always sits beside its icon and name (README).
          title: section.title,
          completed: counts.completed,
          count: counts.total,
        })
      : t('lessonPlayer.complete.badgeSection', { number: section.number, title: section.title });

  const titleNode = <strong>{lesson.title}</strong>;
  const nextStage = firstUnfinishedStage(progress.stagesDone);
  const summaryMessage = finished
    ? completionSummary(lesson.reflect.completionMessage, heading)
    : t('lessonPlayer.complete.partwayBody', { done: progress.stagesDone.length, total: STAGES.length });

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
        <Badge tone={section.id} icon={SECTION_ICONS[section.id]}>
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
            {withSlot(t('lessonPlayer.complete.summary', { title: SLOT, message: summaryMessage }), titleNode)}
          </p>
        </div>

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
          <Button variant="secondary" icon="ArrowLeft" href={`/course#${section.id}`}>
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
  lesson: Lesson;
  /** The learner's progress, or undefined for guests (rows show "Start"). */
  progress: ProgressByLessonId | undefined;
  highlightFirst: boolean;
}) {
  const { t } = useI18n();
  const { section } = useLessonPlayer();
  const showCheck = isLastLessonInSection(lesson);
  const next = getNextLesson(lesson.id);
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
