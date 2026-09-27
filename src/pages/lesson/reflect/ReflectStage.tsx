import { Icon, TaskCard, WritingBox } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { applyStageEvent, isRequiredReflectionAnswered, useLessonPlayer } from '../../../lesson';
import { StageActionBar } from '../StageActionBar';
import './ReflectStage.css';

/**
 * Reflect (docs/screens/LessonReflect.dc.html): one writing box per prompt
 * in lesson.reflect.prompts. Only the required prompt matters for finishing.
 *
 * Done rule (src/lesson/progressRules.ts): answering the required prompt
 * marks Reflect done and completes the lesson (completedAt), in the same
 * saved change as the typing; "Finish lesson" applies it again and opens
 * the completion screen.
 * Next is disabled only while that one required answer is empty (ActionBar's
 * rule); optional prompts never block. Nothing is locked: the completion
 * screen can still be opened by URL or from the StagePath at any time.
 */
export function ReflectStage() {
  const { t } = useI18n();
  const { lesson, progress, update, stageEvent, mode } = useLessonPlayer();
  const canFinish = isRequiredReflectionAnswered(lesson, progress);

  const note =
    mode === 'learner'
      ? t('lessonPlayer.reflect.journalNote')
      : mode === 'look-around'
        ? t('lessonPlayer.reflect.lookAroundNote')
        : t('lessonPlayer.reflect.noLearnerNote');

  return (
    <>
      <TaskCard eyebrow={t('lessonPlayer.reflect.eyebrow')} icon="RefreshCw">
        {t('lessonPlayer.reflect.task')}
      </TaskCard>

      <div className="tw-reflect-prompts">
        {lesson.reflect.prompts.map((prompt, index) => (
          // Phase 5: pass `dictate` and `onDictateClick` here for "Say it",
          // only when the browser can turn speech into text on the device
          // (or a partner has allowed an online service).
          <WritingBox
            key={index}
            id={`reflect-${lesson.id}-${index}`}
            label={prompt.text}
            optional={!prompt.required}
            rows={prompt.required ? 4 : 3}
            value={progress.reflections[index] ?? ''}
            onValueChange={(text) => {
              const now = new Date().toISOString();
              update((p) => {
                const next = { ...p, reflections: { ...p.reflections, [index]: text } };
                return prompt.required ? applyStageEvent(lesson, next, { stage: 'reflect', kind: 'answered' }, now) : next;
              });
            }}
          />
        ))}
      </div>

      <div className="tw-reflect-note">
        <Icon name="NotebookPen" size={22} />
        <span>{note}</span>
      </div>

      <StageActionBar
        disabled={!canFinish}
        helper={canFinish ? undefined : t('lessonPlayer.reflect.finishHelper')}
        onNext={() => stageEvent({ stage: 'reflect', kind: 'finish' })}
      />
    </>
  );
}
