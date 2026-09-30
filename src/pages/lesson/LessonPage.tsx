import type { ComponentType } from 'react';
import { Link, useNavigate } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { Icon, StagePath, StatusBanner } from '../../components/ds';
import { isStageId, type Lesson, type StageId } from '../../content';
import { En, useI18n } from '../../i18n';
import {
  LESSON_PHONE_QUERY,
  LESSON_WIDE_QUERY,
  roundedMinutes,
  useLessonPlayer,
  useMediaQuery,
} from '../../lesson';
import { lessonPath, lessonPrintPath } from '../../app/lessonUrls';
import { CompleteStage } from './complete/CompleteStage';
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
 * template (docs/screens/Lesson*.dc.html, TabletLesson, PhoneLesson).
 *
 * - Laptop (1100px and wider): the lesson's title, the vertical StagePath
 *   (and on Read, the learning goal and time) in a side column; the stage in
 *   the main column.
 * - Tablet and phone: the same intro above a horizontal StagePath (icons
 *   only except the current step, below 600px), then the stage.
 * - 'complete' has its own full-width layout (LessonComplete.dc.html).
 *
 * One element tree serves every width (see the comment in LessonPage), so
 * crossing 1100px never remounts the stage.
 *
 * The page has one h1 (the lesson title; the completion screen's own
 * heading on 'complete') and a visually hidden h2 naming the stage, so a
 * stage's own sections start at h2/h3.
 */
export function LessonPage() {
  const { t } = useI18n();
  const player = useLessonPlayer();
  const { lesson, step, status, mode, saveError } = player;
  usePageTitle(t('pages.lesson.title', { number: lesson.number, stage: t(`stages.${step}`) }));
  const wide = useMediaQuery(LESSON_WIDE_QUERY);
  const phone = useMediaQuery(LESSON_PHONE_QUERY);
  const ready = status === 'ready';

  const banners = <LessonBanners mode={mode} saveError={saveError} />;

  if (!isStageId(step)) {
    return (
      <div className="tw-lesson tw-lesson-complete-page">
        {banners}
        {ready ? <CompleteStage /> : null}
        <LessonSources lesson={lesson} />
      </div>
    );
  }

  const Stage = STAGE_COMPONENTS[step];
  const intro = <LessonIntro lesson={lesson} />;
  const goal = step === 'read' ? <LessonGoal lesson={lesson} /> : null;
  const path = (
    <LessonStagePath orientation={wide ? 'vertical' : 'horizontal'} compact={!wide && phone} current={step} />
  );

  const stageBody = (
    <div className="tw-lesson-stage">
      <h2 className="tw-visually-hidden">{t(`stages.${step}`)}</h2>
      {ready ? <Stage /> : null}
    </div>
  );

  // One element tree at every width: CSS (LessonPage.css) turns it into two
  // columns at 1100px. `wide` only changes props (the StagePath's
  // orientation), never the parents, so rotating a tablet or resizing across
  // 1100px keeps the stage mounted: a playing video, Write's help mode, an
  // open glossary popover and keyboard focus all survive. Only the banners
  // move (they hold no state): above the intro on narrow screens, at the top
  // of the main column on wide ones, so the DOM order follows what is drawn.
  return (
    <div className="tw-lesson tw-lesson-player">
      {wide ? null : banners}
      <aside className="tw-lesson-aside" aria-label={t('lessonPlayer.shell.aboutLesson')}>
        {intro}
        {path}
        {goal}
      </aside>
      <div className="tw-lesson-main">
        {wide ? banners : null}
        {stageBody}
        <LessonSources lesson={lesson} />
      </div>
    </div>
  );
}

function LessonIntro({ lesson }: { lesson: Lesson }) {
  const { t, contentLang } = useI18n();
  const { section } = useLessonPlayer();
  return (
    <div className="tw-lesson-intro">
      <Link to={`/course#${section.id}`} className="tw-lesson-back">
        <Icon name="ArrowLeft" size={18} />
        <En>{section.title}</En>
      </Link>
      <div className="tw-lesson-titles">
        <span className={`eyebrow tw-lesson-number tw-lesson-number-${section.id}`}>
          {t('lesson.number', { number: lesson.number })}
        </span>
        <h1 className="tw-lesson-title" tabIndex={-1} {...contentLang}>
          {lesson.title}
        </h1>
        <p className="tw-lesson-question" {...contentLang}>
          {lesson.essentialQuestion}
        </p>
      </div>
    </div>
  );
}

function LessonGoal({ lesson }: { lesson: Lesson }) {
  const { t, contentLang } = useI18n();
  const [min, max] = lesson.estimatedMinutes;
  return (
    <>
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
      {/* Both reading levels, the key words and every task on paper (docs/notes/phase-6.md). */}
      <Link to={lessonPrintPath(lesson.id)} className="tw-lesson-back tw-lesson-print">
        <Icon name="Printer" size={18} />
        {t('print.printLesson')}
      </Link>
    </>
  );
}

function LessonStagePath({
  orientation,
  compact,
  current,
}: {
  orientation: 'vertical' | 'horizontal';
  compact: boolean;
  current: StageId;
}) {
  const { t } = useI18n();
  const { lesson, progress } = useLessonPlayer();
  const done = progress.stagesDone;
  const sub = (stage: StageId, text: string) => (done.includes(stage) ? t('lessonPlayer.shell.sublabelDone') : text);
  const seconds = lesson.watch.durationSeconds;
  const sublabels =
    orientation === 'vertical'
      ? {
          read: sub('read', t('lessonPlayer.shell.sublabelRead')),
          write: sub('write', t('lessonPlayer.shell.sublabelWrite')),
          speak: sub('speak', t('lessonPlayer.shell.sublabelSpeak')),
          watch: sub(
            'watch',
            seconds
              ? t('lessonPlayer.shell.sublabelWatch', { minutes: roundedMinutes(seconds) })
              : t('lessonPlayer.shell.sublabelWatchNoTime'),
          ),
          reflect: sub('reflect', t('lessonPlayer.shell.sublabelReflect', { count: lesson.reflect.prompts.length })),
        }
      : undefined;
  return (
    <div className={`tw-lesson-path tw-lesson-path-${orientation}`}>
      <StagePath
        orientation={orientation}
        compact={compact}
        current={current}
        done={done}
        sublabels={sublabels}
        hrefFor={(stage) => lessonPath(lesson.id, stage)}
      />
    </div>
  );
}

function LessonBanners({ mode, saveError }: { mode: string; saveError: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <>
      {mode === 'no-learner' ? (
        <StatusBanner
          className="tw-lesson-banner"
          tone="info"
          icon="Info"
          title={t('lessonPlayer.shell.noLearnerTitle')}
          action={t('lessonPlayer.shell.noLearnerAction')}
          onAction={() => void navigate('/')}
        >
          {t('lessonPlayer.shell.noLearnerBody')}
        </StatusBanner>
      ) : null}
      {saveError ? (
        <StatusBanner className="tw-lesson-banner" tone="info" icon="Info">
          {t('lessonPlayer.shell.saveError')}
        </StatusBanner>
      ) : null}
    </>
  );
}
