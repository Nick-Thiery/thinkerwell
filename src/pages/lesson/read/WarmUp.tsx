import { Chip, TaskCard, WritingBox } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';

/**
 * "Before you read": the lesson's warm-up question. With options it is a
 * row of one-tap chips (a radio group); without, a small writing box. Any
 * answer is fine and there is no feedback: it only gets the learner
 * thinking. Saved as progress.warmUpAnswer (the option's text).
 */
export function WarmUp() {
  const { t } = useI18n();
  const { lesson, progress, update } = useLessonPlayer();
  const { question, options } = lesson.warmUp;
  const answer = progress.warmUpAnswer;

  function choose(option: string) {
    if (answer === option) return; // tapping the chosen chip again keeps it chosen
    update((p) => ({ ...p, warmUpAnswer: option }), { immediate: true });
  }

  return (
    <TaskCard eyebrow={t('lessonPlayer.read.warmUpEyebrow')} icon="Lightbulb">
      <p className="tw-read-warmup-question">
        {question} {t(options ? 'lessonPlayer.read.warmUpHint' : 'lessonPlayer.read.warmUpHintWriting')}
      </p>
      {options ? (
        <div role="radiogroup" aria-label={t('lessonPlayer.read.warmUpChoices')} className="tw-read-chips">
          {options.map((option) => (
            <Chip key={option} role="radio" selected={answer === option} onClick={() => choose(option)}>
              {option}
            </Chip>
          ))}
        </div>
      ) : (
        <WritingBox
          className="tw-read-warmup-box"
          label={t('lessonPlayer.read.warmUpWritingLabel')}
          rows={3}
          value={answer ?? ''}
          onValueChange={(value) => update((p) => ({ ...p, warmUpAnswer: value }))}
        />
      )}
    </TaskCard>
  );
}
