import { Chip, TaskCard, WritingBox } from '../../../components/ds';
import { En, useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';

/**
 * "Before you read": the lesson's warm-up question. With options it is a
 * row of one-tap chips (a radio group); without, a small writing box. Any
 * answer is fine and there is no feedback: it only gets the learner
 * thinking. Saved as progress.warmUpAnswer (the option's text).
 */
export function WarmUp() {
  const { t, contentLang } = useI18n();
  const { lesson, progress, update } = useLessonPlayer();
  const answer = progress.warmUpAnswer;
  // A preview course's lesson may begin straight with the reading.
  if (!lesson.warmUp) return null;
  const { question, options } = lesson.warmUp;

  function choose(option: string) {
    if (answer === option) return; // tapping the chosen chip again keeps it chosen
    update((p) => ({ ...p, warmUpAnswer: option }), { immediate: true });
  }

  return (
    <TaskCard eyebrow={t('lessonPlayer.read.warmUpEyebrow')} icon="Lightbulb">
      <p className="tw-read-warmup-question">
        <En>{question}</En> {t(options ? 'lessonPlayer.read.warmUpHint' : 'lessonPlayer.read.warmUpHintWriting')}
      </p>
      {options ? (
        <div role="radiogroup" aria-label={t('lessonPlayer.read.warmUpChoices')} className="tw-read-chips">
          {options.map((option) => (
            <Chip key={option} role="radio" selected={answer === option} onClick={() => choose(option)} {...contentLang}>
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
