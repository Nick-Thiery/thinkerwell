/**
 * The lesson player's shared state: the lesson, the learner's progress on it,
 * saving, the reading level and device settings. Mounted once per lesson by
 * LessonRoute, above every stage, so moving between stages keeps the loaded
 * progress and flushes anything unsaved.
 *
 *   const player = useLessonPlayer();
 *   player.update((p) => ({ ...p, writing: { ...p.writing, text } }));   // typing: saved after 500 ms of quiet
 *   player.update((p) => ({ ...p, warmUpAnswer: 'Near the river' }), { immediate: true });
 *   player.stageEvent({ stage: 'speak', kind: 'practised' });            // applies src/lesson/progressRules.ts
 *   player.goTo('write');                                                 // flushes, then navigates
 *
 * Saving (learner mode only):
 * - Changes apply to `progress` straight away and are queued as pure
 *   functions. The queue is written to IndexedDB after 500 ms without a new
 *   change, or at once for `{ immediate: true }`, stage events and goTo().
 * - It is also flushed when focus leaves any field (blur), when the stage
 *   changes and when the lesson player unmounts (any route change).
 * - The queued functions are replayed on top of the stored record inside
 *   one IndexedDB transaction (store.updateProgress), so a save never
 *   overwrites fields it didn't change.
 * - On pagehide (reload, closing the tab) and visibilitychange (hidden),
 *   the page may be gone before a read could come back, so the player
 *   instead writes its whole in-memory record in a single request issued
 *   straight away (store.putProgress). That record already holds every
 *   change, so any queued or in-flight batch it covers is dropped rather
 *   than replayed over it.
 * - That put can still be cut off: the browser may tear the page down while
 *   it waits behind a save already running. So just before it, the same
 *   record is also copied, synchronously, to localStorage
 *   (src/storage/unsavedProgress.ts). The copy is removed as soon as a write
 *   covering it lands; if the page went away first, the next getStore()
 *   writes it back to IndexedDB before anything reads progress. Nothing
 *   typed is lost, even mid-pause.
 *
 * Guests (look-around, or nobody chosen) get the same API, but every change
 * stays in memory for this visit only (./guestMemory.ts). Nothing is written
 * to IndexedDB.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { lessonPath } from '../app/lessonUrls';
import { getLessonSection, isStageId, type Lesson, type LessonStep, type Section, type StageId } from '../content';
import { useLearnerSession } from '../session';
import {
  DEFAULT_SETTINGS,
  emptyProgress,
  forgetUnsavedProgress,
  getStore,
  keepUnsavedProgress,
  type DeviceSettings,
  type LessonProgress,
  type ListeningSpeed,
  type ReadingLevel,
  type ThinkerwellStore,
} from '../storage';
import {
  clearGuestMemory,
  getGuestProgress,
  getGuestReadingLevel,
  setGuestProgress,
  setGuestReadingLevel,
  VISIT_SEED,
} from './guestMemory';
import { applyStageEvent, type StageEvent } from './progressRules';

/** How long typing must pause before a save. */
export const SAVE_DEBOUNCE_MS = 500;

/**
 * 'learner': a chosen learner; everything is saved on the device.
 * 'look-around': "Just look around" (or ?preview=true); nothing is saved.
 * 'no-learner': nobody chosen yet (a lesson link opened directly); nothing
 *   is saved, and the lesson shows a note offering to choose who's learning.
 */
export type LessonPlayerMode = 'learner' | 'look-around' | 'no-learner';

export type ProgressChange = (progress: LessonProgress) => LessonProgress;

export interface UpdateOptions {
  /** Save now rather than after the typing pause (choices, ticks, buttons). */
  immediate?: boolean;
}

export interface LessonPlayerValue {
  lesson: Lesson;
  section: Section;
  /** The step in the URL: a stage, or 'complete'. */
  step: LessonStep;
  /** 'loading' until the learner's progress and the device settings are read. Stages render nothing until 'ready'. */
  status: 'loading' | 'ready';
  mode: LessonPlayerMode;
  /** True only in 'learner' mode: work is saved on this device. */
  saving: boolean;
  /** The learner's progress on this lesson (an empty record if they haven't started, or a guest's in-memory one). */
  progress: LessonProgress;
  /** True if the last save failed (storage full or blocked). Cleared by the next successful save. */
  saveError: boolean;
  /** Changes progress now; saves after the typing pause, or at once with `{ immediate: true }`. `change` must be pure. */
  update: (change: ProgressChange, options?: UpdateOptions) => void;
  /** Writes anything queued now. Safe to call any time; resolves when written. */
  flush: () => Promise<void>;
  /** Reports something the learner did; marks the stage done (and completes the lesson) per progressRules.ts. Saves at once. */
  stageEvent: (event: StageEvent) => void;
  /** Standard or Simpler: the learner's own choice, else the device's preferredReadingLevel. */
  readingLevel: ReadingLevel;
  /** Remembers the choice for this learner (or, for a guest, in memory for this visit). */
  setReadingLevel: (level: ReadingLevel) => void;
  /** Device settings (save data, listening speed, ...). DEFAULT_SETTINGS until loaded. */
  settings: DeviceSettings;
  /**
   * Listen's Slow / Normal. Applies at once; saved as the device's
   * listening speed only for a chosen learner (look-around saves nothing).
   */
  setListeningSpeed: (speed: ListeningSpeed) => void;
  /** Owner part of the quick-check shuffle seed: the learner id, or this visit's seed for a guest. Use with checkSeed(). */
  seedOwner: string;
  /** Saves anything queued, then goes to another step of this lesson. */
  goTo: (step: LessonStep) => void;
}

const LessonPlayerContext = createContext<LessonPlayerValue | null>(null);

export function useLessonPlayer(): LessonPlayerValue {
  const value = useContext(LessonPlayerContext);
  if (!value) throw new Error('useLessonPlayer must be used inside a LessonPlayerProvider');
  return value;
}

/** For tests and isolated component previews: provides a ready-made value. */
export const LessonPlayerTestProvider = LessonPlayerContext.Provider;

export interface LessonPlayerProviderProps {
  lesson: Lesson;
  step: LessonStep;
  children: ReactNode;
}

/**
 * Picks the mode from the learner session and remounts the player whenever
 * who is learning changes (switching learner mid-lesson), so one learner's
 * progress is never shown or saved under another's name.
 */
export function LessonPlayerProvider({ lesson, step, children }: LessonPlayerProviderProps) {
  const session = useLearnerSession();
  if (session.status === 'loading') return null;
  const mode: LessonPlayerMode = session.activeLearner ? 'learner' : session.lookAround ? 'look-around' : 'no-learner';
  const owner = session.activeLearner?.id ?? mode;
  return (
    <PlayerForOwner key={`${lesson.id}:${owner}`} lesson={lesson} step={step} mode={mode}>
      {children}
    </PlayerForOwner>
  );
}

interface QueuedChange {
  change: ProgressChange;
  /** The stage open when the change was made: saved as currentStage (for Continue). */
  stage: StageId | null;
}

function PlayerForOwner({
  lesson,
  step,
  mode,
  children,
}: LessonPlayerProviderProps & { mode: LessonPlayerMode }) {
  const session = useLearnerSession();
  const navigate = useNavigate();
  const learner = mode === 'learner' ? session.activeLearner : null;
  const learnerId = learner?.id ?? null;
  const section = getLessonSection(lesson);

  const [status, setStatus] = useState<'loading' | 'ready'>(learnerId ? 'loading' : 'ready');
  const [progress, setProgressState] = useState<LessonProgress>(() =>
    learnerId ? emptyProgress(learnerId, lesson.id) : getGuestProgress(lesson.id),
  );
  // The same record, readable synchronously (for the last-moment save).
  const progressRef = useRef(progress);
  const setProgress = useCallback((next: LessonProgress) => {
    progressRef.current = next;
    setProgressState(next);
  }, []);
  const [settings, setSettings] = useState<DeviceSettings>(DEFAULT_SETTINGS);
  const [guestLevel, setGuestLevelState] = useState<ReadingLevel | null>(() => (learnerId ? null : getGuestReadingLevel()));
  const [saveError, setSaveError] = useState(false);

  const alive = useRef(true);
  const hasRecord = useRef(false);
  const queue = useRef<QueuedChange[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = useRef<Promise<void>>(Promise.resolve());
  /** The store once opened, for the synchronous last-moment save. */
  const storeRef = useRef<ThinkerwellStore | null>(null);
  /** How many changes have been made; and up to which change a last-moment save has already written. */
  const changeCount = useRef(0);
  const coveredUpTo = useRef(0);
  /** The change count when the last-moment copy (localStorage) was kept; 0 when there is none. */
  const keptUpTo = useRef(0);
  /** Removes the last-moment copy once a write covering it (up to change `upTo`) has landed. */
  const writtenUpTo = useCallback(
    (upTo: number) => {
      if (!learnerId || keptUpTo.current === 0 || upTo < keptUpTo.current) return;
      keptUpTo.current = 0;
      forgetUnsavedProgress(learnerId, lesson.id);
    },
    [learnerId, lesson.id],
  );
  const stepRef = useRef<LessonStep>(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Load the learner's progress (learner mode) and the device settings.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (learnerId) {
        // A real learner is working now: forget anything a guest did on this visit.
        clearGuestMemory();
      }
      if (!session.storageAvailable) {
        if (!cancelled) setStatus('ready');
        return;
      }
      try {
        const store = await getStore();
        storeRef.current = store;
        const [saved, deviceSettings] = await Promise.all([
          learnerId ? store.getProgress(learnerId, lesson.id) : Promise.resolve(undefined),
          store.getSettings(),
        ]);
        if (cancelled || !alive.current) return;
        setSettings(deviceSettings);
        if (learnerId && saved) {
          hasRecord.current = true;
          // Anything changed before the load finished is replayed on top.
          const pending = queue.current;
          setProgress(pending.reduce((acc, item) => item.change(acc), saved));
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error(error);
      } finally {
        if (!cancelled && alive.current) setStatus('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
    // session.storageAvailable is read once: it doesn't change within a lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerId, lesson.id]);

  const flush = useCallback((): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!learnerId || queue.current.length === 0) return writing.current;
    const batch = queue.current;
    queue.current = [];
    const upTo = changeCount.current;
    const lessonId = lesson.id;
    writing.current = writing.current.then(async () => {
      // A last-moment save already wrote the whole record, these changes included.
      if (coveredUpTo.current >= upTo) return;
      try {
        const store = await getStore();
        await store.updateProgress(learnerId, lessonId, (current) =>
          batch.reduce((acc, item) => {
            const next = item.change(acc);
            return item.stage ? { ...next, currentStage: item.stage } : next;
          }, current),
        );
        hasRecord.current = true;
        writtenUpTo(upTo);
        if (alive.current) setSaveError(false);
      } catch (error) {
        if (import.meta.env.DEV) console.error(error);
        // Keep the changes for the next try (the next flush).
        queue.current = [...batch, ...queue.current];
        if (alive.current) setSaveError(true);
      }
    });
    return writing.current;
  }, [learnerId, lesson.id, writtenUpTo]);

  const update = useCallback(
    (change: ProgressChange, options?: UpdateOptions) => {
      const current = stepRef.current;
      const stage = isStageId(current) ? current : null;
      if (!learnerId) {
        const prev = progressRef.current;
        const next = { ...change(prev), currentStage: stage ?? prev.currentStage, updatedAt: new Date().toISOString() };
        setGuestProgress(next);
        setProgress(next);
        return;
      }
      const changed = change(progressRef.current);
      setProgress(stage && changed.currentStage !== stage ? { ...changed, currentStage: stage } : changed);
      changeCount.current += 1;
      queue.current.push({ change, stage });
      // The queued change will create the record if there isn't one yet, so
      // from now on opening a stage records it as current straight away.
      // (Set here, not after the write lands: goTo() navigates without
      // waiting, and the next stage must still be saved as the current one.)
      hasRecord.current = true;
      if (options?.immediate) {
        void flush();
      } else {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
      }
    },
    [learnerId, flush, setProgress],
  );

  /**
   * The last-moment save (pagehide, tab hidden): a synchronous copy of the
   * whole in-memory record in localStorage, then one put of it, issued
   * before this returns. Falls back to flush() until the store is open.
   */
  const saveNow = useCallback(() => {
    if (!learnerId || changeCount.current <= coveredUpTo.current) return;
    const record = progressRef.current;
    const upTo = changeCount.current;
    if (keepUnsavedProgress(record)) keptUpTo.current = upTo;
    const store = storeRef.current;
    if (!store) {
      void flush();
      return;
    }
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const coveredBefore = coveredUpTo.current;
    queue.current = [];
    coveredUpTo.current = upTo;
    hasRecord.current = true;
    const retryLater = (error: unknown) => {
      if (import.meta.env.DEV) console.error(error);
      // Try again with the next save: the whole record goes back in the queue.
      queue.current = [{ change: () => record, stage: null }, ...queue.current];
      changeCount.current += 1;
      if (alive.current) setSaveError(true);
    };
    let put: Promise<unknown>;
    try {
      put = store.putProgress(record);
    } catch (error) {
      // The connection is closing or gone: the kept copy covers it, and the
      // whole record is queued for the next save if the page lives on.
      coveredUpTo.current = coveredBefore;
      retryLater(error);
      return;
    }
    put.then(
      () => {
        writtenUpTo(upTo);
        if (alive.current) setSaveError(false);
      },
      retryLater,
    );
  }, [learnerId, flush, writtenUpTo]);

  const stageEvent = useCallback(
    (event: StageEvent) => {
      const now = new Date().toISOString();
      const change: ProgressChange = (p) => applyStageEvent(lesson, p, event, now);
      // An event that marks nothing done (Continue with an empty Write box)
      // changes nothing, so it must not create a record for a lesson the
      // learner hasn't started: just looking never counts as "In progress".
      const current = progressRef.current;
      if (change(current) === current && (learnerId ? !hasRecord.current : true)) return;
      update(change, { immediate: true });
    },
    [lesson, update, learnerId],
  );

  // Opening a stage records it as the current one, but only for a lesson the
  // learner already has a record for: just looking at a lesson never creates
  // one (their first real change carries the stage instead).
  useEffect(() => {
    if (status !== 'ready' || !learnerId || !isStageId(step) || !hasRecord.current) return;
    update((p) => (p.currentStage === step ? p : { ...p, currentStage: step }), { immediate: true });
  }, [status, learnerId, step, update]);

  // Flush when the stage changes (the cleanup runs before the next stage's effects).
  useEffect(() => () => void flush(), [step, flush]);

  // Flush on blur of any field; save at once when the tab is hidden or the page goes away.
  useEffect(() => {
    if (!learnerId) return undefined;
    const onFocusOut = () => void flush();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    const onPageHide = () => saveNow();
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [learnerId, flush, saveNow]);

  const readingLevel: ReadingLevel =
    (learnerId ? learner?.readingLevel : guestLevel) ?? settings.preferredReadingLevel;

  const { setLearnerReadingLevel } = session;
  const setReadingLevel = useCallback(
    (level: ReadingLevel) => {
      if (learnerId) {
        void setLearnerReadingLevel(learnerId, level).catch((error: unknown) => {
          if (import.meta.env.DEV) console.error(error);
        });
      } else {
        setGuestReadingLevel(level);
        setGuestLevelState(level);
      }
    },
    [learnerId, setLearnerReadingLevel],
  );

  const setListeningSpeed = useCallback(
    (speed: ListeningSpeed) => {
      setSettings((current) => (current.listeningSpeed === speed ? current : { ...current, listeningSpeed: speed }));
      if (!learnerId || !session.storageAvailable) return;
      void getStore()
        .then((store) => store.updateSettings({ listeningSpeed: speed }))
        .catch((error: unknown) => {
          if (import.meta.env.DEV) console.error(error);
        });
    },
    // session.storageAvailable doesn't change within a lesson (see the load effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [learnerId],
  );

  const goTo = useCallback(
    (target: LessonStep) => {
      void flush();
      void navigate(lessonPath(lesson.id, target));
    },
    [flush, navigate, lesson.id],
  );

  const value = useMemo<LessonPlayerValue>(
    () => ({
      lesson,
      section,
      step,
      status,
      mode,
      saving: mode === 'learner',
      progress,
      saveError,
      update,
      flush,
      stageEvent,
      readingLevel,
      setReadingLevel,
      settings,
      setListeningSpeed,
      seedOwner: learnerId ?? VISIT_SEED,
      goTo,
    }),
    [
      lesson,
      section,
      step,
      status,
      mode,
      progress,
      saveError,
      update,
      flush,
      stageEvent,
      readingLevel,
      setReadingLevel,
      settings,
      setListeningSpeed,
      learnerId,
      goTo,
    ],
  );

  return <LessonPlayerContext.Provider value={value}>{children}</LessonPlayerContext.Provider>;
}
