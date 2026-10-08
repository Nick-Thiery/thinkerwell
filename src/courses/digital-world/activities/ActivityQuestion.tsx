import { useMemo } from 'react';
import { QuestionCard } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { checkSeed, seededShuffle, useLessonPlayer } from '../../../lesson';
import { feedbackWithoutVerdict } from '../../../pages/lesson/read/feedbackText';
import { useActivityState } from './state';

export interface ActivityChoice {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface ActivityQuestionProps {
  /** Where the answer is saved in the activity's answers. */
  answerKey: string;
  /** The question's number for its shuffle (each question in an activity its own, from 0). */
  seedIndex: number;
  eyebrow?: string;
  question: string;
  options: readonly ActivityChoice[];
}

/**
 * A choice question inside an activity, as the quick check asks one: the
 * options in an order of their own for each learner (the same every time
 * they come back), "Correct" in teal or "Not quite" in burnt orange with
 * the option's own hint, and any other option can be chosen at any time.
 * Never locked, never timed. The answer is saved with the lesson's work.
 */
export function ActivityQuestion({ answerKey, seedIndex, eyebrow, question, options }: ActivityQuestionProps) {
  const { contentLocale } = useI18n();
  const { lesson, seedOwner } = useLessonPlayer();
  const { answers, choose } = useActivityState();
  // Seeds of their own, well clear of the quick check's (0, 1, 2 ...).
  const order = useMemo(() => seededShuffle(options, checkSeed(seedOwner, lesson.id, 100 + seedIndex)), [options, seedOwner, lesson.id, seedIndex]);
  const saved = answers[answerKey];
  const savedIndex = saved !== undefined && options[Number(saved)] ? Number(saved) : undefined;
  const shown = savedIndex === undefined ? undefined : options[savedIndex];
  const position = savedIndex === undefined ? undefined : order.findIndex((entry) => entry.index === savedIndex);
  return (
    <QuestionCard
      eyebrow={eyebrow}
      prompt={question}
      options={order.map((entry) => entry.item.text)}
      selected={position}
      result={shown ? (shown.correct ? 'correct' : 'retry') : undefined}
      feedback={shown ? feedbackWithoutVerdict(shown.feedback, shown.correct, contentLocale.code) : undefined}
      headingLevel={3}
      onSelect={(index) => {
        const entry = order[index];
        if (entry) choose(answerKey, String(entry.index));
      }}
    />
  );
}
