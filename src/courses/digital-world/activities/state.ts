import { useCallback } from 'react';
import { useLessonPlayer } from '../../../lesson';
import type { ActivityProgress, LessonProgress } from '../../../storage';

const EMPTY: ActivityProgress = { answers: {}, seen: [] };

function withActivity(change: (activity: ActivityProgress) => ActivityProgress) {
  return (progress: LessonProgress): LessonProgress => {
    const before = progress.activity ?? EMPTY;
    const after = change(before);
    return after === before ? progress : { ...progress, activity: after };
  };
}

export interface ActivityState {
  /** The learner's choices and writing, by the activity's own ids. */
  answers: Readonly<Record<string, string>>;
  /** What they opened, tapped or finished, in order. */
  seen: readonly string[];
  /** A choice: saved at once. null takes it away. */
  choose: (key: string, value: string | null) => void;
  /** Writing: saved after the typing pause, like the rest of the lesson's writing. */
  write: (key: string, text: string) => void;
  /** Marks something opened or finished (once). */
  see: (id: string) => void;
  /** Takes a mark away (a message part tapped again). */
  unsee: (id: string) => void;
}

/**
 * The activity's part of the learner's lesson work (progress.activity),
 * saved through the lesson player like everything else in the lesson: on
 * this device for a chosen learner, in memory only for anyone looking
 * around (src/lesson/LessonPlayerContext.tsx). Nothing is saved just by
 * opening the activity. Finishing it never marks a stage done
 * (src/lesson/progressRules.ts): the stage's own rules decide that.
 */
export function useActivityState(): ActivityState {
  const { progress, update } = useLessonPlayer();
  const activity = progress.activity ?? EMPTY;

  const choose = useCallback(
    (key: string, value: string | null) =>
      update(
        withActivity((a) => {
          if ((a.answers[key] ?? null) === value) return a;
          const answers = { ...a.answers };
          if (value === null) delete answers[key];
          else answers[key] = value;
          return { ...a, answers };
        }),
        { immediate: true },
      ),
    [update],
  );
  const write = useCallback(
    (key: string, text: string) => update(withActivity((a) => (a.answers[key] === text ? a : { ...a, answers: { ...a.answers, [key]: text } }))),
    [update],
  );
  const see = useCallback(
    (id: string) => update(withActivity((a) => (a.seen.includes(id) ? a : { ...a, seen: [...a.seen, id] })), { immediate: true }),
    [update],
  );
  const unsee = useCallback(
    (id: string) => update(withActivity((a) => (a.seen.includes(id) ? { ...a, seen: a.seen.filter((s) => s !== id) } : a)), { immediate: true }),
    [update],
  );
  return { answers: activity.answers, seen: activity.seen, choose, write, see, unsee };
}
