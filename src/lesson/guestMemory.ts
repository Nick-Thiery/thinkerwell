/**
 * What a guest (look-around, or nobody chosen yet) has done on this visit,
 * kept in memory only. Nothing here is ever written to IndexedDB or browser
 * storage (CLAUDE.md rule 4: "Anyone can 'Just look around' without
 * saving"). It lives as long as the page does at most. The learner session
 * (src/session/LearnerSessionContext.tsx) clears it whenever someone starts
 * looking around, returns to "Who's learning today?", or chooses or adds a
 * learner, and the lesson player clears it when a real learner opens a
 * lesson, so the next person on a shared device never sees a guest's
 * answers (CLAUDE.md rule 4).
 */
import { emptyProgress, type LessonProgress, type ReadingLevel } from '../storage';

/** The learnerId written into a guest's in-memory progress records. */
const GUEST_ID = 'guest';

const progressByLesson = new Map<string, LessonProgress>();
let readingLevel: ReadingLevel | null = null;

/**
 * A seed for this visit only, for shuffling quick-check options while
 * looking around: stable while the page stays open, different next visit.
 */
export const VISIT_SEED = `visit-${Math.floor(Math.random() * 2 ** 32).toString(36)}`;

export function getGuestProgress(lessonId: string): LessonProgress {
  return progressByLesson.get(lessonId) ?? emptyProgress(GUEST_ID, lessonId);
}

export function setGuestProgress(progress: LessonProgress): void {
  progressByLesson.set(progress.lessonId, progress);
}

export function getGuestReadingLevel(): ReadingLevel | null {
  return readingLevel;
}

export function setGuestReadingLevel(level: ReadingLevel): void {
  readingLevel = level;
}

/** Forgets everything a guest did on this visit. */
export function clearGuestMemory(): void {
  progressByLesson.clear();
  readingLevel = null;
}
