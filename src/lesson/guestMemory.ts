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
 *
 * One way out of memory, and only by the guest's own choice: "Save my work"
 * in a lesson's head holds a copy of what they did (`holdWorkToSave`), Home
 * asks who they are, and the learner they choose or add claims it
 * (`claimWorkToSave`); the lesson player then saves it to that learner as it
 * opens (`takeClaimedWork`, ./saveGuestWork.ts) and goes back to where the
 * guest was. Anyone starting to look around or going back to "Who's learning
 * today?" drops it, and Home offers "Don't keep it" (docs/notes/simpler-lessons.md).
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

/** A guest's work waiting to be saved, and where they were. */
export interface WorkToSave {
  records: LessonProgress[];
  /** The address to go back to once it is saved (a lesson step). */
  returnTo: string;
  /** The lesson it was saved from, to say so on Home. */
  lessonNumber: number;
  /** The learner who claimed it, once chosen or added. */
  claimedBy: string | null;
}

let workToSave: WorkToSave | null = null;

/** What the guest has done on this visit, as copies, lessons with nothing in them left out. */
export function guestWork(): LessonProgress[] {
  return [...progressByLesson.values()].map((record) => structuredClone(record));
}

/** Holds a copy of the guest's work until someone is chosen (or it is dropped). */
export function holdWorkToSave(records: LessonProgress[], returnTo: string, lessonNumber: number): void {
  workToSave = records.length > 0 ? { records, returnTo, lessonNumber, claimedBy: null } : null;
}

/** The work waiting to be saved, if any, and not yet claimed. */
export function peekWorkToSave(): WorkToSave | null {
  return workToSave && workToSave.claimedBy === null ? workToSave : null;
}

/** The chosen learner claims the waiting work; returns where to go back to, or null when nothing was waiting. */
export function claimWorkToSave(learnerId: string): string | null {
  if (!workToSave || workToSave.claimedBy !== null) return null;
  workToSave = { ...workToSave, claimedBy: learnerId };
  return workToSave.returnTo;
}

/** The work this learner claimed, handed over once (the lesson player saves it). */
export function takeClaimedWork(learnerId: string): LessonProgress[] | null {
  if (!workToSave || workToSave.claimedBy !== learnerId) return null;
  const { records } = workToSave;
  workToSave = null;
  return records;
}

/** Forgets the waiting work: "Don't keep it", or someone else starting. */
export function dropWorkToSave(): void {
  workToSave = null;
}
