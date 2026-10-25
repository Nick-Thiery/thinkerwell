import { useState, type ComponentType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useFullPageTitle } from '../../app/usePageTitle';
import { Button, Icon, StagePath, StatusBanner } from '../../components/ds';
import { isStageId, type CourseLesson, type StageId } from '../../content';
import { useLessonContent } from '../../content/useContent';
import { En, useI18n } from '../../i18n';
import { LESSON_PHONE_QUERY, useLessonPlayer, useMediaQuery } from '../../lesson';
import { guestWork, holdWorkToSave } from '../../lesson/guestMemory';
import { useLearnerSession } from '../../session';
import { lessonPath, lessonPrintPath } from '../../app/lessonUrls';
import { CompleteStage } from './complete/CompleteStage';
import { LessonDisclosure } from './LessonDisclosure';
import { LessonSources } from './LessonSources';
import { ReadStage } from './read/ReadStage';
import { ReflectStage } from './reflect/ReflectStage';
import { SpeakStage } from './speak/SpeakStage';
import { WatchStage } from './watch/WatchStage';
import { WriteStage } from './write/WriteStage';
import './LessonPage.css';

/** One component per stage. Each renders its own content and its StageActionBar, reading everything from useLessonPlayer(). */
const STAGE_COMPONENTS: Record<StageId, ComponentType> = {
  read: ReadStage,
  write: WriteStage,
  speak: SpeakStage,
  watch: WatchStage,
  reflect: ReflectStage,
};

/**
 * The lesson player's page: /lesson/:id/:stage for every lesson from one
 * template, in one calm column at every width (docs/notes/simpler-lessons.md):
 *
 * - A compact head: the way back to the course and whether work is saved
 *   (said once, here, never again in the steps), the lesson's number and
 *   title, the step indicator, and "About this lesson" (the question, the
 *   learning goal, the time and the print view), open at the lesson's start
 *   and folded away after.
 * - The step indicator: the five labelled steps from 600px; on a phone
 *   "Step 2 of 5 · Write" with "All steps" opening the same five links.
 *   Every step can be opened in any order (CLAUDE.md rule 3).
 * - The stage, ending in its one Continue (StageActionBar), then the
 *   lesson's sources.
 * - 'complete' has its own full-width layout (LessonComplete.dc.html).
 *
 * The page has one h1 (the lesson title; the completion screen's own
 * heading on 'complete') and a visually hidden h2 naming the stage, so a
 * stage's own sections start at h2/h3.
 */
export function LessonPage() {
  const { t } = useI18n();
  const player = useLessonPlayer();
  const { lesson, step, status, saveError } = player;
  // The Read step is the lesson's public, indexed address, so its tab says
  // what its HTML file says to search engines (seo.lessonTitle,
  // docs/notes/seo.md); the other steps name the step.
  useFullPageTitle(
    step === 'read'
      ? t('seo.lessonTitle', { number: lesson.number, title: lesson.title })
      : t('app.documentTitle', { page: t('pages.lesson.title', { number: lesson.number, stage: t(`stages.${step}`) }) }),
  );
  const ready = status === 'ready';

  const saveErrorBanner = saveError ? (
    <StatusBanner className="tw-lesson-banner" tone="info" icon="Info">
      {t('lessonPlayer.shell.saveError')}
    </StatusBanner>
  ) : null;

  if (!isStageId(step)) {
    return (
      <div className="tw-lesson tw-lesson-complete-page">
        <LessonSaveStatus standalone />
        {saveErrorBanner}
        {ready ? <CompleteStage /> : null}
        <LessonSources lesson={lesson} />
      </div>
    );
  }

  const Stage = STAGE_COMPONENTS[step];

  return (
    <div className="tw-lesson tw-lesson-player">
      <header className="tw-lesson-head">
        <LessonTopRow />
        {saveErrorBanner}
        <LessonTitle lesson={lesson} />
        <LessonSteps current={step} />
        <AboutLesson key={`${lesson.id}:${step}`} lesson={lesson} />
      </header>
      <div className="tw-lesson-stage">
        <h2 className="tw-visually-hidden">{t(`stages.${step}`)}</h2>
        {ready ? <Stage /> : null}
      </div>
      <LessonSources lesson={lesson} />
    </div>
  );
}

/** The way back to the course (the lesson's own section) and whether work is saved. */
function LessonTopRow() {
  const { section } = useLessonPlayer();
  const content = useLessonContent();
  return (
    <div className="tw-lesson-toprow">
      <Link to={content.coursePath(section.id)} className="tw-lesson-back">
        <Icon name="ArrowLeft" size={18} />
        <En>{section.title}</En>
      </Link>
      <LessonSaveStatus />
    </div>
  );
}

/**
 * Whether this lesson's work is kept, said once for the whole lesson: saved
 * on this device for a chosen learner; for anyone else, that nothing is
 * saved, never more (CLAUDE.md: never tell a guest their work is saved).
 *
 * A guest who has done something gets "Save my work": it holds a copy of
 * what they did, goes to "Who's learning today?", and the learner they
 * choose or add gets it, back on this same step (docs/notes/simpler-lessons.md).
 * Before they have done anything it is "Choose who's learning".
 */
function LessonSaveStatus({ standalone = false }: { standalone?: boolean }) {
  const { t } = useI18n();
  const { mode, lesson } = useLessonPlayer();
  const session = useLearnerSession();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  if (mode === 'learner') {
    if (standalone) return null;
    return (
      <p className="tw-lesson-status tw-lesson-status-saved">
        <Icon name="Check" size={18} strokeWidth={3} />
        <span>{t('lessonPlayer.shell.statusSaved')}</span>
      </p>
    );
  }

  const lookAround = mode === 'look-around';
  // With no storage there is nobody to choose: no action (as the look-around banner).
  const canChoose = session.storageAvailable;
  // Read on every render: the player re-renders with each change a guest makes, so this follows along.
  const hasWork = guestWork().length > 0;
  const choose = async () => {
    const work = hasWork ? guestWork() : [];
    // Going back to the picker forgets a guest's work (and anything held), so hold the copy after it.
    if (lookAround) await session.returnToPicker();
    holdWorkToSave(work, `${pathname}${search}`, lesson.number);
    await navigate('/');
  };
  return (
    <div className={`tw-lesson-status tw-lesson-status-unsaved${standalone ? ' tw-lesson-status-standalone' : ''}`}>
      <p className="tw-lesson-status-text">
        <Icon name={lookAround ? 'Eye' : 'Info'} size={18} />
        <span>{t(lookAround ? 'lessonPlayer.shell.statusLookAround' : 'lessonPlayer.shell.statusNotSaved')}</span>
      </p>
      {canChoose ? (
        <Button variant="ghost" className="tw-lesson-status-action" onClick={() => void choose()}>
          {t(hasWork ? 'lessonPlayer.shell.saveMyWork' : 'lessonPlayer.shell.noLearnerAction')}
        </Button>
      ) : null}
    </div>
  );
}

function LessonTitle({ lesson }: { lesson: CourseLesson }) {
  const { t, contentLang } = useI18n();
  const { section } = useLessonPlayer();
  const content = useLessonContent();
  return (
    <div className="tw-lesson-titles">
      <span className={`eyebrow tw-lesson-number tw-lesson-number-${content.sectionLook(section.id).tone}`}>
        {t('lesson.number', { number: lesson.number })}
      </span>
      <h1 className="tw-lesson-title" tabIndex={-1} {...contentLang}>
        {lesson.title}
      </h1>
    </div>
  );
}

/**
 * The lesson's steps (five, or four without Watch). From 600px: the labelled
 * StagePath in one row. On a phone: "Step 2 of 5 · Write" ("of 4" without
 * Watch) and "All steps", which opens the same links
 * (closed again by moving to another step: the parent keys it by step).
 */
function LessonSteps({ current }: { current: StageId }) {
  const { t } = useI18n();
  const { lesson, progress } = useLessonPlayer();
  // Five steps, or four without Watch (a translated language with no video of its own for this lesson).
  const stages = useLessonContent().stagesFor(lesson);
  const phone = useMediaQuery(LESSON_PHONE_QUERY);
  const [openAt, setOpenAt] = useState<StageId | null>(null);
  const open = openAt === current;
  const listId = `lesson-steps-${lesson.id}`;
  const path = (orientation: 'horizontal' | 'vertical') => (
    <StagePath
      orientation={orientation}
      current={current}
      stages={stages}
      done={progress.stagesDone}
      hrefFor={(stage) => lessonPath(lesson.id, stage)}
    />
  );

  if (!phone) return <div className="tw-lesson-path tw-lesson-path-horizontal">{path('horizontal')}</div>;

  return (
    <div className="tw-lesson-steps-phone">
      <div className="tw-lesson-steps-row">
        <p className="tw-lesson-step-count">
          {t('lessonPlayer.shell.stepOf', {
            number: stages.indexOf(current) + 1,
            total: stages.length,
            stage: t(`stages.${current}`),
          })}
        </p>
        <Button
          variant="ghost"
          className="tw-lesson-steps-toggle"
          iconRight="ChevronDown"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpenAt(open ? null : current)}
        >
          {t('lessonPlayer.shell.allSteps')}
        </Button>
      </div>
      {open ? (
        <div id={listId} className="tw-lesson-path tw-lesson-path-vertical">
          {path('vertical')}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The lesson's question, learning goal, time and print view. From 600px
 * open when the lesson starts (Read, nothing done yet), folded away on every
 * other visit; on a phone folded away at first too, so the reading comes
 * first. Opening or closing it is the learner's own choice from then on.
 */
function AboutLesson({ lesson }: { lesson: CourseLesson }) {
  const { t, contentLang } = useI18n();
  const { step, status, progress } = useLessonPlayer();
  const phone = useMediaQuery(LESSON_PHONE_QUERY);
  const atStart = !phone && status === 'ready' && step === 'read' && progress.stagesDone.length === 0;
  const [min, max] = lesson.estimatedMinutes;
  return (
    <LessonDisclosure className="tw-lesson-about" summary={t('lessonPlayer.shell.aboutLesson')} defaultOpen={atStart}>
      <p className="tw-lesson-question" {...contentLang}>
        {lesson.essentialQuestion}
      </p>
      <div className="tw-lesson-goal">
        <span className="eyebrow tw-lesson-goal-label">
          <Icon name="Target" size={16} />
          {t('lessonPlayer.shell.learningGoal')}
        </span>
        <p className="body" {...contentLang}>
          {lesson.learningGoal}
        </p>
      </div>
      <p className="small tw-lesson-time">
        <Icon name="Clock" size={16} />
        {t('lessonPlayer.shell.time', { min, max })}
      </p>
      {/* The lesson on paper (docs/notes/phase-6.md). */}
      <Link to={lessonPrintPath(lesson.id)} className="tw-lesson-back tw-lesson-print">
        <Icon name="Printer" size={18} />
        {t('print.printLesson')}
      </Link>
    </LessonDisclosure>
  );
}
