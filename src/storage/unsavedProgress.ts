/**
 * The last-moment safety net for lesson work (an unsent draft, in CLAUDE.md's
 * words): a copy of a learner's in-memory lesson record, kept in this
 * browser's localStorage only while an IndexedDB write for it may not have
 * landed yet. IndexedDB stays the only source of truth.
 *
 * Why: on pagehide (reload, closing the tab) and when the tab is hidden, the
 * lesson player issues one IndexedDB put of the whole record. The browser
 * may tear the page down before that put commits (for example while it waits
 * behind a save already running), and the text typed last would be lost.
 * localStorage writes are synchronous, so a copy kept here survives.
 *
 * - keepUnsavedProgress() is called with the record just before the put.
 * - forgetUnsavedProgress() is called once a write covering it has landed.
 * - recoverUnsavedProgress() runs when the app opens its store (getStore),
 *   before anything reads progress: any copy still here is the newest state
 *   of that lesson (the page went away before its write landed), so it is
 *   written to IndexedDB and then removed. Copies for learners who no longer
 *   exist are dropped.
 * - Removing a learner, or all data, removes their copies too.
 *
 * Only learners' records ever go here; look-around never writes anything.
 * Every access is wrapped: storage can be blocked, full or missing, and the
 * app works the same without it (just without the safety net).
 */
import type { LessonProgress } from './types';

const PREFIX = 'thinkerwell:unsaved-progress:';

interface StoredCopy {
  v: 1;
  record: LessonProgress;
}

/** Just what recovery needs to write the record back. */
interface ProgressWriter {
  getLearner(id: string): Promise<unknown>;
  updateProgress(
    learnerId: string,
    lessonId: string,
    update: (current: LessonProgress) => LessonProgress,
  ): Promise<LessonProgress>;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function keyFor(learnerId: string, lessonId: string): string {
  return `${PREFIX}${encodeURIComponent(learnerId)}:${encodeURIComponent(lessonId)}`;
}

function isRecord(value: unknown): value is LessonProgress {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<LessonProgress>;
  return (
    typeof r.learnerId === 'string' &&
    typeof r.lessonId === 'string' &&
    Array.isArray(r.stagesDone) &&
    typeof r.currentStage === 'string' &&
    !!r.writing &&
    !!r.speak &&
    !!r.watch &&
    !!r.checkAnswers &&
    !!r.reflections
  );
}

/** Keeps a copy of the whole record, synchronously. Returns whether it was kept. */
export function keepUnsavedProgress(record: LessonProgress): boolean {
  const store = storage();
  if (!store) return false;
  try {
    const copy: StoredCopy = { v: 1, record };
    store.setItem(keyFor(record.learnerId, record.lessonId), JSON.stringify(copy));
    return true;
  } catch {
    return false;
  }
}

/** Removes the copy for one learner and lesson (a write covering it has landed). */
export function forgetUnsavedProgress(learnerId: string, lessonId: string): void {
  try {
    storage()?.removeItem(keyFor(learnerId, lessonId));
  } catch {
    // Nothing to do: recovery will write the same record again, harmlessly.
  }
}

function ownKeys(learnerId?: string): string[] {
  const store = storage();
  if (!store) return [];
  const prefix = learnerId === undefined ? PREFIX : `${PREFIX}${encodeURIComponent(learnerId)}:`;
  const keys: string[] = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

/** Removes every copy for one learner, or for everyone when no id is given. */
export function forgetAllUnsavedProgress(learnerId?: string): void {
  for (const key of ownKeys(learnerId)) {
    try {
      storage()?.removeItem(key);
    } catch {
      // Blocked storage: nothing was kept there either.
    }
  }
}

/** Every copy still kept (unreadable ones are removed). */
export function listUnsavedProgress(): LessonProgress[] {
  const records: LessonProgress[] = [];
  for (const key of ownKeys()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(storage()?.getItem(key) ?? 'null');
    } catch {
      parsed = null;
    }
    const record = (parsed as Partial<StoredCopy> | null)?.record;
    if (isRecord(record)) {
      records.push(record);
    } else {
      try {
        storage()?.removeItem(key);
      } catch {
        // Ignore.
      }
    }
  }
  return records;
}

/**
 * Writes every kept copy back to IndexedDB and removes it. Never throws: a
 * copy that can't be written stays for the next try.
 */
export async function recoverUnsavedProgress(store: ProgressWriter): Promise<void> {
  for (const record of listUnsavedProgress()) {
    try {
      if (!(await store.getLearner(record.learnerId))) {
        forgetUnsavedProgress(record.learnerId, record.lessonId);
        continue;
      }
      // The copy is the whole record as the learner last saw it, so it
      // replaces the stored one (startedAt is kept from whichever is older).
      await store.updateProgress(record.learnerId, record.lessonId, (current) => ({
        ...current,
        ...record,
        startedAt: current.startedAt < record.startedAt ? current.startedAt : record.startedAt,
      }));
      forgetUnsavedProgress(record.learnerId, record.lessonId);
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
    }
  }
}
