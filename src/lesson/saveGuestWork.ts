import type { LessonProgress, ThinkerwellStore } from '../storage';
import { mergeProgress } from '../storage/mergeWork';

/**
 * Saves a guest's work to the learner who claimed it ("Save my work",
 * ./guestMemory.ts), lesson by lesson. A lesson the learner already has
 * work in is combined the way a work file is (mergeProgress: nothing is
 * lost, the learner's own record wins a tie); one they haven't is saved as
 * the guest left it.
 */
export async function saveGuestWork(store: ThinkerwellStore, learnerId: string, records: readonly LessonProgress[]): Promise<void> {
  for (const record of records) {
    const existing = await store.getProgress(learnerId, record.lessonId);
    const theirs: LessonProgress = { ...record, learnerId };
    await store.updateProgress(learnerId, record.lessonId, (current) => (existing ? mergeProgress(current, theirs) : theirs));
  }
}
