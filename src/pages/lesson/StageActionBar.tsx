import { ActionBar } from '../../components/ds';
import { STAGES, isStageId, type LessonStep, type StageId } from '../../content';
import { useI18n } from '../../i18n';
import { useLessonPlayer } from '../../lesson';

export interface StageActionBarProps {
  /** Next button label. Default "Continue to {next stage}", or "Finish lesson" on Reflect. */
  next?: string;
  /** Runs first when Next is pressed (report a stage event here). */
  onNext?: () => void;
  /**
   * Where Next goes after `onNext`. Default: the next stage (Reflect goes to
   * 'complete'). `null` stays on this page (for Read's own parts).
   */
  nextStep?: LessonStep | null;
  /** Back button label. Default: the previous stage's name. `null` hides it (the default on Read). */
  back?: string | null;
  /** Runs instead of the default back navigation when given. */
  onBack?: () => void;
  /** What to do to continue, shown beside Next. */
  helper?: string;
  /** Only a stage's required answer may disable Next (Reflect's first prompt). */
  disabled?: boolean;
}

function previousStage(stage: StageId): StageId | undefined {
  return STAGES[STAGES.indexOf(stage) - 1];
}

function followingStep(stage: StageId): LessonStep {
  return STAGES[STAGES.indexOf(stage) + 1] ?? 'complete';
}

/**
 * The ActionBar at the bottom of every stage, wired to the lesson's own
 * navigation. Its Next button is the one ink primary button on each stage
 * (docs/design-system/README.md), so a stage passes 'secondary' to any other
 * main action (VoiceRecorder's actionVariant, VideoCard's watchVariant).
 */
export function StageActionBar({ next, onNext, nextStep, back, onBack, helper, disabled }: StageActionBarProps) {
  const { t } = useI18n();
  const { step, goTo } = useLessonPlayer();
  const stage = isStageId(step) ? step : undefined;

  const defaultNextStep = stage ? followingStep(stage) : undefined;
  const target = nextStep === undefined ? defaultNextStep : nextStep;
  const defaultNextLabel =
    stage === 'reflect'
      ? t('lessonPlayer.shell.finishLesson')
      : target && isStageId(target)
        ? t('lessonPlayer.shell.continueTo', { stage: t(`stages.${target}`) })
        : undefined;

  const prev = stage ? previousStage(stage) : undefined;
  const backLabel = back === undefined ? (prev ? t(`stages.${prev}`) : undefined) : (back ?? undefined);

  return (
    <ActionBar
      back={backLabel}
      onBack={() => {
        if (onBack) onBack();
        else if (prev) goTo(prev);
      }}
      next={next ?? defaultNextLabel}
      helper={helper}
      disabled={disabled}
      onNext={() => {
        onNext?.();
        if (target) goTo(target);
      }}
    />
  );
}
