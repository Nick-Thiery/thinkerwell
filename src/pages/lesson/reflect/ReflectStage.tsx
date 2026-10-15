import { TaskCard } from '../../../components/ds';
import { En, useI18n } from '../../../i18n';
import { applyStageEvent, hasText, isRequiredReflectionAnswered, useLessonPlayer } from '../../../lesson';
import { LessonDisclosure } from '../LessonDisclosure';
import { SayItBox, useSayIt } from '../sayIt';
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
 *
 * The required prompt is in view; the optional ones wait behind "Add
 * another thought" (open when one already has an answer), so what finishes
 * the lesson is never in doubt (docs/notes/simpler-lessons.md). Whether
 * answers are saved is said once, in the lesson's head.
 *
 * Every box has "Say it" where speech can be turned into text on the
 * device (../sayIt.tsx); spoken words are saved exactly like typing, so a
 * spoken answer to the required prompt completes the lesson too.
 */
export function ReflectStage() {
  const { t } = useI18n();
  const { lesson, progress, update, stageEvent, mode } = useLessonPlayer();
  const canFinish = isRequiredReflectionAnswered(lesson, progress);
  const sayIt = useSayIt();

  const box = (index: number) => {
    const prompt = lesson.reflect.prompts[index]!;
    return (
      <SayItBox
        key={index}
        sayIt={sayIt}
        id={`reflect-${lesson.id}-${index}`}
        label={<En>{prompt.text}</En>}
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
    );
  };
  const indexes = lesson.reflect.prompts.map((_, index) => index);
  const required = indexes.filter((index) => lesson.reflect.prompts[index]!.required);
  const optional = indexes.filter((index) => !lesson.reflect.prompts[index]!.required);
  const optionalAnswered = optional.some((index) => hasText(progress.reflections[index] ?? ''));

  return (
    <>
      <TaskCard eyebrow={t('lessonPlayer.reflect.eyebrow')} icon="RefreshCw">
        {t('lessonPlayer.reflect.task')}
      </TaskCard>

      <div className="tw-reflect-prompts">{required.map(box)}</div>

      {optional.length > 0 ? (
        <LessonDisclosure
          className="tw-reflect-more"
          icon="Plus"
          summary={t('lessonPlayer.reflect.addAnother')}
          defaultOpen={optionalAnswered}
        >
          <div className="tw-reflect-prompts">{optional.map(box)}</div>
        </LessonDisclosure>
      ) : null}

      {/* Where a learner's answers go (a guest's head already says nothing is saved). */}
      {mode === 'learner' ? <p className="tw-reflect-journal">{t('lessonPlayer.reflect.journalNote')}</p> : null}

      {sayIt.announcer}

      <StageActionBar
        disabled={!canFinish}
        helper={canFinish ? undefined : t('lessonPlayer.reflect.finishHelper')}
        onNext={() => stageEvent({ stage: 'reflect', kind: 'finish' })}
      />
    </>
  );
}
