/**
 * The typed on-device storage API. Everything is kept in IndexedDB on this
 * device and nothing is ever sent anywhere.
 *
 *   const store = await getStore();
 *   const learners = await store.listLearners();
 */
import { deleteDB, type IDBPDatabase } from 'idb';
import { DB_NAME, openThinkerwellDb, SETTINGS_KEY, type ThinkerwellDB } from './db';
import {
  DEFAULT_SETTINGS,
  LEARNER_COLOURS,
  type DeviceSettings,
  type Learner,
  type LessonProgress,
  type NewLearner,
  type QuizAttempt,
  type Recording,
  type SectionId,
  type SectionQuizRecord,
  type StageId,
} from './types';

export interface ThinkerwellStore {
  // Learners
  /** Every learner on this device, oldest first. */
  listLearners(): Promise<Learner[]>;
  getLearner(id: string): Promise<Learner | undefined>;
  /** Trims the name; throws if it is empty. Drops a blank class code. */
  addLearner(input: NewLearner): Promise<Learner>;
  /** Throws if the learner doesn't exist. A blank or undefined classCode removes it. */
  updateLearner(id: string, patch: Partial<Pick<Learner, 'name' | 'colour' | 'classCode'>>): Promise<Learner>;
  /** Deletes the learner and all their progress, quiz attempts and recordings, all or nothing. */
  removeLearner(id: string): Promise<void>;

  // Progress
  getProgress(learnerId: string, lessonId: string): Promise<LessonProgress | undefined>;
  listProgress(learnerId: string): Promise<LessonProgress[]>;
  /** The lesson this learner worked on most recently, for "Continue". */
  getLatestProgress(learnerId: string): Promise<LessonProgress | undefined>;
  /**
   * Read-modify-write in one transaction. `update` gets the saved progress (or
   * an empty record) and returns the new one; it must not be async.
   */
  updateProgress(
    learnerId: string,
    lessonId: string,
    update: (current: LessonProgress) => LessonProgress,
  ): Promise<LessonProgress>;
  /** Adds the stage to stagesDone once, keeping the order stages were finished in. */
  markStageDone(learnerId: string, lessonId: string, stage: StageId): Promise<LessonProgress>;
  setCurrentStage(learnerId: string, lessonId: string, stage: StageId): Promise<LessonProgress>;

  // Section checks
  getQuizRecord(learnerId: string, sectionId: SectionId): Promise<SectionQuizRecord | undefined>;
  listQuizRecords(learnerId: string): Promise<SectionQuizRecord[]>;
  /** Keeps this attempt as the latest, and as the best if it scores at least as well. */
  recordQuizAttempt(learnerId: string, sectionId: SectionId, attempt: QuizAttempt): Promise<SectionQuizRecord>;

  // Recordings (latest clip only, never uploaded)
  getRecording(learnerId: string, lessonId: string): Promise<Recording | undefined>;
  saveRecording(learnerId: string, lessonId: string, blob: Blob, durationMs: number): Promise<Recording>;
  deleteRecording(learnerId: string, lessonId: string): Promise<void>;

  // Device settings
  /** Stored settings over the defaults, so settings added later get their default. */
  getSettings(): Promise<DeviceSettings>;
  /** Merges the patch in (partner options merged key by key) and returns the result. */
  updateSettings(patch: Partial<DeviceSettings>): Promise<DeviceSettings>;

  // Device values
  /** The current learner, or null if none is set or that learner was removed. */
  getCurrentLearnerId(): Promise<string | null>;
  /** Throws if the learner doesn't exist. null means nobody ("Just look around"). */
  setCurrentLearnerId(id: string | null): Promise<void>;

  close(): void;
}

const now = (): string => new Date().toISOString();

/** A fresh progress record for a lesson nobody has started yet. */
export function emptyProgress(learnerId: string, lessonId: string): LessonProgress {
  const time = now();
  return {
    learnerId,
    lessonId,
    stagesDone: [],
    currentStage: 'read',
    warmUpAnswer: null,
    checkAnswers: {},
    writing: { text: '', planning: {}, selfCheck: {}, exampleShown: false },
    speak: { practisedHow: null },
    watch: { beforeAnswer: '', afterAnswer: '', readInstead: false },
    reflections: {},
    startedAt: time,
    updatedAt: time,
    completedAt: null,
  };
}

/** DEFAULT_SETTINGS with whatever is stored on top, partner options merged key by key. */
function mergeSettings(base: DeviceSettings, patch: Partial<DeviceSettings> | undefined): DeviceSettings {
  if (!patch) return { ...base, partner: { ...base.partner } };
  return {
    ...base,
    ...patch,
    partner: { ...base.partner, ...patch.partner },
  };
}

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A learner needs a name.');
  return trimmed;
}

function checkColour(colour: string): void {
  if (!(LEARNER_COLOURS as readonly string[]).includes(colour)) {
    throw new Error(`Unknown learner colour: ${colour}`);
  }
}

/** Keys from IDBKeyRange.only(learnerId) in a byLearner index. */
function learnerRange(learnerId: string): IDBKeyRange {
  return IDBKeyRange.only(learnerId);
}

/** Every [learnerId, updatedAt] key for one learner in byLearnerUpdated. */
function learnerUpdatedRange(learnerId: string): IDBKeyRange {
  // Arrays sort after strings in IndexedDB, so [learnerId, []] is above every [learnerId, '<date>'].
  return IDBKeyRange.bound([learnerId], [learnerId, []]);
}

function createStore(db: IDBPDatabase<ThinkerwellDB>): ThinkerwellStore {
  async function updateProgress(
    learnerId: string,
    lessonId: string,
    update: (current: LessonProgress) => LessonProgress,
  ): Promise<LessonProgress> {
    const tx = db.transaction('progress', 'readwrite');
    const current = (await tx.store.get([learnerId, lessonId])) ?? emptyProgress(learnerId, lessonId);
    const next: LessonProgress = { ...update(current), learnerId, lessonId, updatedAt: now() };
    await Promise.all([tx.store.put(next), tx.done]);
    return next;
  }

  return {
    async listLearners() {
      return db.getAllFromIndex('learners', 'byCreatedAt');
    },

    async getLearner(id) {
      return db.get('learners', id);
    },

    async addLearner(input) {
      checkColour(input.colour);
      const learner: Learner = {
        id: crypto.randomUUID(),
        name: cleanName(input.name),
        colour: input.colour,
        createdAt: now(),
      };
      const classCode = input.classCode?.trim();
      if (classCode) learner.classCode = classCode;
      await db.add('learners', learner);
      return learner;
    },

    async updateLearner(id, patch) {
      // Check the patch first, so a bad one never opens a transaction.
      const name = patch.name === undefined ? undefined : cleanName(patch.name);
      if (patch.colour !== undefined) checkColour(patch.colour);
      const tx = db.transaction('learners', 'readwrite');
      const current = await tx.store.get(id);
      if (!current) throw new Error(`No learner with id ${id}`);
      const next: Learner = { ...current };
      if (name !== undefined) next.name = name;
      if (patch.colour !== undefined) next.colour = patch.colour;
      if ('classCode' in patch) {
        const classCode = patch.classCode?.trim();
        if (classCode) next.classCode = classCode;
        else delete next.classCode;
      }
      await Promise.all([tx.store.put(next), tx.done]);
      return next;
    },

    async removeLearner(id) {
      const tx = db.transaction(['learners', 'progress', 'quizAttempts', 'recordings', 'device'], 'readwrite');
      const progress = tx.objectStore('progress');
      const quizAttempts = tx.objectStore('quizAttempts');
      const recordings = tx.objectStore('recordings');
      const device = tx.objectStore('device');
      const range = learnerRange(id);

      async function deleteAll(): Promise<void> {
        const [progressKeys, quizKeys, recordingKeys, currentId] = await Promise.all([
          progress.index('byLearner').getAllKeys(range),
          quizAttempts.index('byLearner').getAllKeys(range),
          recordings.index('byLearner').getAllKeys(range),
          device.get('currentLearnerId'),
        ]);
        // Every request is tracked (and marked handled) as it is made, so if a
        // later one throws, the earlier ones' abort errors aren't left unhandled.
        const requests: Promise<unknown>[] = [];
        const track = (request: Promise<unknown>): void => {
          request.catch(() => undefined);
          requests.push(request);
        };
        track(tx.objectStore('learners').delete(id));
        for (const key of progressKeys) track(progress.delete(key));
        for (const key of quizKeys) track(quizAttempts.delete(key));
        for (const key of recordingKeys) track(recordings.delete(key));
        if (currentId === id) track(device.put(null, 'currentLearnerId'));
        await Promise.all(requests);
      }

      const work = (async () => {
        try {
          await deleteAll();
        } catch (error) {
          // A failed request aborts the transaction on its own; anything else
          // (a throw before a request was made) must abort it here, so nothing is deleted.
          try {
            tx.abort();
          } catch {
            // Already aborted or finished.
          }
          throw error;
        }
      })();

      await Promise.all([work, tx.done]);
    },

    async getProgress(learnerId, lessonId) {
      return db.get('progress', [learnerId, lessonId]);
    },

    async listProgress(learnerId) {
      return db.getAllFromIndex('progress', 'byLearner', learnerRange(learnerId));
    },

    async getLatestProgress(learnerId) {
      const cursor = await db
        .transaction('progress')
        .store.index('byLearnerUpdated')
        .openCursor(learnerUpdatedRange(learnerId), 'prev');
      return cursor?.value;
    },

    updateProgress,

    async markStageDone(learnerId, lessonId, stage) {
      return updateProgress(learnerId, lessonId, (current) =>
        current.stagesDone.includes(stage) ? current : { ...current, stagesDone: [...current.stagesDone, stage] },
      );
    },

    async setCurrentStage(learnerId, lessonId, stage) {
      return updateProgress(learnerId, lessonId, (current) => ({ ...current, currentStage: stage }));
    },

    async getQuizRecord(learnerId, sectionId) {
      return db.get('quizAttempts', [learnerId, sectionId]);
    },

    async listQuizRecords(learnerId) {
      return db.getAllFromIndex('quizAttempts', 'byLearner', learnerRange(learnerId));
    },

    async recordQuizAttempt(learnerId, sectionId, attempt) {
      const tx = db.transaction('quizAttempts', 'readwrite');
      const current = await tx.store.get([learnerId, sectionId]);
      const record: SectionQuizRecord = current
        ? {
            learnerId,
            sectionId,
            // On a tie the newer attempt becomes the best.
            best: attempt.score >= current.best.score ? attempt : current.best,
            latest: attempt,
            attempts: current.attempts + 1,
          }
        : { learnerId, sectionId, best: attempt, latest: attempt, attempts: 1 };
      await Promise.all([tx.store.put(record), tx.done]);
      return record;
    },

    async getRecording(learnerId, lessonId) {
      return db.get('recordings', [learnerId, lessonId]);
    },

    async saveRecording(learnerId, lessonId, blob, durationMs) {
      const recording: Recording = {
        learnerId,
        lessonId,
        blob,
        mimeType: blob.type,
        durationMs,
        createdAt: now(),
      };
      // put() replaces any earlier clip: one per learner and lesson.
      await db.put('recordings', recording);
      return recording;
    },

    async deleteRecording(learnerId, lessonId) {
      await db.delete('recordings', [learnerId, lessonId]);
    },

    async getSettings() {
      return mergeSettings(DEFAULT_SETTINGS, await db.get('settings', SETTINGS_KEY));
    },

    async updateSettings(patch) {
      const tx = db.transaction('settings', 'readwrite');
      const current = mergeSettings(DEFAULT_SETTINGS, await tx.store.get(SETTINGS_KEY));
      const next = mergeSettings(current, patch);
      await Promise.all([tx.store.put(next, SETTINGS_KEY), tx.done]);
      return next;
    },

    async getCurrentLearnerId() {
      const tx = db.transaction(['device', 'learners']);
      const id = await tx.objectStore('device').get('currentLearnerId');
      if (typeof id !== 'string') return null;
      const learner = await tx.objectStore('learners').get(id);
      return learner ? id : null;
    },

    async setCurrentLearnerId(id) {
      const tx = db.transaction(['device', 'learners'], 'readwrite');
      if (id !== null && !(await tx.objectStore('learners').get(id))) {
        throw new Error(`No learner with id ${id}`);
      }
      await Promise.all([tx.objectStore('device').put(id, 'currentLearnerId'), tx.done]);
    },

    close() {
      db.close();
    },
  };
}

/**
 * Opens a store on its own connection. The app uses getStore() instead; this
 * is for tests and tools. `onClose` runs if the connection closes on its own
 * (another tab upgrading the database, or the browser ending it).
 */
export async function openStore(name: string = DB_NAME, onClose?: () => void): Promise<ThinkerwellStore> {
  const db = await openThinkerwellDb(name, onClose ? { onClose } : {});
  return createStore(db);
}

let singleton: Promise<ThinkerwellStore> | undefined;

/**
 * The app-wide store, opened the first time it is asked for. If opening fails
 * (IndexedDB blocked or broken) the next call tries again.
 */
export function getStore(): Promise<ThinkerwellStore> {
  if (!singleton) {
    const opening: Promise<ThinkerwellStore> = openStore(DB_NAME, () => {
      // The connection closed on its own; open a new one next time.
      if (singleton === opening) singleton = undefined;
    });
    singleton = opening;
    opening.catch(() => {
      if (singleton === opening) singleton = undefined;
    });
  }
  return singleton;
}

/** Closes the app-wide store if it is open. The next getStore() opens it again. */
async function closeSingleton(): Promise<void> {
  const current = singleton;
  singleton = undefined;
  if (!current) return;
  try {
    (await current).close();
  } catch {
    // It never opened, so there is nothing to close.
  }
}

/**
 * Whether on-device storage works here. Some private windows block IndexedDB;
 * the app then offers "Just look around" only.
 */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;
    await getStore();
    return true;
  } catch {
    return false;
  }
}

/**
 * Asks the browser to keep this site's data even when the device runs low on
 * space, so learners' work isn't cleared. Returns whether storage is persistent.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Removes everything Thinkerwell stored on this device: every learner, all
 * their work and recordings, and the settings. Cannot be undone.
 */
export async function deleteAllData(name: string = DB_NAME): Promise<void> {
  if (name === DB_NAME) await closeSingleton();
  await deleteDB(name, {
    blocked() {
      // Another tab has it open; that tab closes its connection in `blocking`.
      console.warn('Thinkerwell storage: waiting for other tabs to close before removing everything.');
    },
  });
}
