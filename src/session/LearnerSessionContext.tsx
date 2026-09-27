import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getStore,
  isStorageAvailable,
  requestPersistentStorage,
  type Learner,
  type NewLearner,
  type ReadingLevel,
} from '../storage';
// Imported directly (not through src/lesson/index.ts) to keep this module
// free of the lesson player's React code.
import { clearGuestMemory } from '../lesson/guestMemory';

export type LearnerSessionStatus = 'loading' | 'ready';

export interface LearnerSessionValue {
  /**
   * 'loading' until the device's learners and current learner have been read
   * from IndexedDB (or storage has been found unavailable). Home, the
   * dashboard and the course map show nothing that depends on this data
   * (and no heading) while it is 'loading', then render for real once it is
   * 'ready' — see AppLayout's focus-after-navigation handling.
   */
  status: LearnerSessionStatus;
  /** False when IndexedDB can't be used here (some private windows). Look-around is then the only option. */
  storageAvailable: boolean;
  /** Every learner on this device, oldest first. Always empty when storage is unavailable. */
  learners: Learner[];
  /**
   * The learner saved as current on this device, or null (nobody chosen, or
   * "Just look around" explicitly cleared them). This can still be set while
   * `lookAround` is true — for example ?preview=true opened on a device that
   * already has a saved learner — so anything learner-facing (progress, the
   * header chip, "who am I saving this as") should read `activeLearner`
   * instead, never this one directly.
   */
  currentLearner: Learner | null;
  /**
   * True while browsing without saving: chosen from the picker, forced by a
   * missing IndexedDB, or started from an old educator link (?preview=true).
   * Nothing is written to storage while this is true — not even settings a
   * lesson would otherwise remember (Listen's speed). The one exception is
   * the Settings page (/settings), where an educator deliberately sets up
   * the device.
   */
  lookAround: boolean;
  /**
   * `currentLearner`, but null whenever `lookAround` is true. This is the
   * one to use for anything a learner would see as "theirs": it can never
   * point at a real learner while the header is also saying nothing is
   * saved, however `currentLearner` itself got set (r2-spec-4).
   */
  activeLearner: Learner | null;
  /** Makes this learner current and turns look-around off. */
  chooseLearner: (id: string) => Promise<void>;
  /**
   * Adds a learner and makes them current. Asks the browser to keep this
   * site's storage the first time a learner is ever added on this device.
   */
  addLearner: (input: NewLearner) => Promise<Learner>;
  /** Deletes a learner and all their progress, quiz attempts and recordings. */
  removeLearner: (id: string) => Promise<void>;
  /** Starts browsing without saving. Nothing is written to storage. */
  startLookAround: () => void;
  /** Clears the current learner (if any) and turns look-around off, back to the "who's learning" picker. */
  returnToPicker: () => Promise<void>;
  /**
   * Reads the device's learners again, after learners were added outside
   * the session (loading work from a file in Settings). The current learner
   * and look-around stay as they are.
   */
  reloadLearners: () => Promise<void>;
  /**
   * Remembers a learner's Standard / Simpler choice on their own record
   * (phase 4). Never called in look-around: the lesson player keeps a
   * guest's choice in memory instead.
   */
  setLearnerReadingLevel: (id: string, level: ReadingLevel) => Promise<void>;
}

const LearnerSessionContext = createContext<LearnerSessionValue | null>(null);

export function useLearnerSession(): LearnerSessionValue {
  const value = useContext(LearnerSessionContext);
  if (!value) throw new Error('useLearnerSession must be used inside a LearnerSessionProvider');
  return value;
}

export interface LearnerSessionProviderProps {
  /**
   * True whenever the current URL should be browsed in look-around mode
   * regardless of any saved current learner: ?preview=true on an old
   * educator link. Re-checked on every render (AppLayout passes the current
   * location's own query string), so it takes effect on any navigation, not
   * only the first.
   */
  forceLookAround?: boolean;
  children: ReactNode;
}

/**
 * Loads the device's learners once and keeps them, the current learner and
 * look-around mode in memory for every page. Mounted once, in AppLayout,
 * above the router outlet.
 */
export function LearnerSessionProvider({ forceLookAround = false, children }: LearnerSessionProviderProps) {
  const [status, setStatus] = useState<LearnerSessionStatus>('loading');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [currentLearner, setCurrentLearner] = useState<Learner | null>(null);
  const [lookAround, setLookAround] = useState(forceLookAround);
  // Guards every state update against firing after the provider (effectively
  // the whole app) has been torn down — most visible in tests, which unmount
  // between cases while a fake-indexeddb request is still in flight. Reset to
  // true on every (re)mount, not only false on unmount: React's StrictMode
  // deliberately mounts, cleans up and remounts each effect once in dev, and
  // without the reset here the very first mount's cleanup would leave this
  // false forever, silently dropping every later real load.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const available = await isStorageAvailable();
      if (!alive.current) return;
      setStorageAvailable(available);
      if (!available) {
        setLearners([]);
        setCurrentLearner(null);
        setLookAround(true);
        setStatus('ready');
        return;
      }
      const store = await getStore();
      const [list, currentId] = await Promise.all([store.listLearners(), store.getCurrentLearnerId()]);
      if (!alive.current) return;
      setLearners(list);
      setCurrentLearner(currentId ? (list.find((l) => l.id === currentId) ?? null) : null);
      setStatus('ready');
    } catch (error) {
      // A storage failure (not just storage being absent) shouldn't leave
      // Home stuck on "loading" forever: fall back to the same plain-words,
      // look-around-only state as "no IndexedDB at all".
      if (import.meta.env.DEV) console.error(error);
      if (!alive.current) return;
      setStorageAvailable(false);
      setLearners([]);
      setCurrentLearner(null);
      setLookAround(true);
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    // Reading IndexedDB on mount and storing what it returns: the standard
    // fetch-in-effect pattern. There is no synchronous or Suspense-friendly
    // way to read it, and every setState inside `load` happens after an
    // await, once storage has actually answered, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // ?preview=true starts look-around at any point, on any page, and stays on
  // until the learner (or someone else on the shared device) chooses a
  // learner or explicitly returns to the picker; it never writes to storage.
  const lookAroundRef = useRef(lookAround);
  useEffect(() => {
    lookAroundRef.current = lookAround;
  }, [lookAround]);
  useEffect(() => {
    if (!forceLookAround) return;
    // Entering look-around from a preview link starts a new guest, like
    // "Just look around" does; staying in it (another preview link) doesn't.
    if (!lookAroundRef.current) clearGuestMemory();
    // Syncing in-memory mode from the URL's own query string, an external input.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLookAround(true);
  }, [forceLookAround]);

  const chooseLearner = useCallback(async (id: string) => {
    if (!storageAvailable) return;
    // Whoever was looking around before is done: forget what they did.
    clearGuestMemory();
    const store = await getStore();
    await store.setCurrentLearnerId(id);
    if (!alive.current) return;
    setCurrentLearner(learners.find((l) => l.id === id) ?? null);
    setLookAround(false);
  }, [learners, storageAvailable]);

  const addLearner = useCallback(async (input: NewLearner): Promise<Learner> => {
    clearGuestMemory();
    const store = await getStore();
    const learner = await store.addLearner(input);
    if (!alive.current) return learner;
    const isFirstEver = learners.length === 0;
    setLearners((prev) => [...prev, learner]);
    await store.setCurrentLearnerId(learner.id);
    if (!alive.current) return learner;
    setCurrentLearner(learner);
    setLookAround(false);
    if (isFirstEver) void requestPersistentStorage();
    return learner;
  }, [learners]);

  const removeLearner = useCallback(async (id: string) => {
    const store = await getStore();
    await store.removeLearner(id);
    if (!alive.current) return;
    setLearners((prev) => prev.filter((l) => l.id !== id));
    setCurrentLearner((prev) => (prev?.id === id ? null : prev));
  }, []);

  const startLookAround = useCallback(() => {
    // Every "Just look around" is a new guest on a shared device: nothing a
    // previous guest did on this visit may show (CLAUDE.md rule 4). Cleared
    // before the state change, so a lesson player that mounts for the new
    // guest reads empty memory.
    clearGuestMemory();
    setLookAround(true);
    // Only clears anything when there was a learner to clear: a brand-new
    // guest with nobody current touches storage not at all (CLAUDE.md: not
    // even settings, while looking around). When a learner WAS current
    // (started from the header switcher, or ?preview=true on a device that
    // already has one), clear them too — in memory straight away, and on
    // disk — or the header would keep showing that learner's name while
    // "nothing is saved" is on screen, and a reload would drop the guest
    // straight back into that learner's own account. This is a clear, the
    // same as "Switch learner" does, not new data being saved.
    if (currentLearner) {
      setCurrentLearner(null);
      if (storageAvailable) {
        void getStore()
          .then((store) => store.setCurrentLearnerId(null))
          .catch((error) => {
            if (import.meta.env.DEV) console.error(error);
          });
      }
    }
  }, [currentLearner, storageAvailable]);

  const returnToPicker = useCallback(async () => {
    // Back to "Who's learning today?": the next person starts clean. (Even
    // with no storage, where the guest stays in look-around, this is where
    // someone hands the device on.)
    clearGuestMemory();
    // With no storage there is no picker to return to (Home stays on its own
    // no-storage explanation): leave look-around exactly as it is rather
    // than turning it off with nothing behind it.
    if (!storageAvailable) return;
    const store = await getStore();
    await store.setCurrentLearnerId(null);
    if (!alive.current) return;
    setCurrentLearner(null);
    setLookAround(false);
  }, [storageAvailable]);

  const reloadLearners = useCallback(async () => {
    if (!storageAvailable) return;
    const store = await getStore();
    const list = await store.listLearners();
    if (!alive.current) return;
    setLearners(list);
    setCurrentLearner((prev) => (prev ? (list.find((l) => l.id === prev.id) ?? null) : null));
  }, [storageAvailable]);

  const setLearnerReadingLevel = useCallback(async (id: string, level: ReadingLevel) => {
    if (!storageAvailable) return;
    const store = await getStore();
    const updated = await store.updateLearner(id, { readingLevel: level });
    if (!alive.current) return;
    setLearners((prev) => prev.map((l) => (l.id === id ? updated : l)));
    setCurrentLearner((prev) => (prev?.id === id ? updated : prev));
  }, [storageAvailable]);

  const activeLearner = lookAround ? null : currentLearner;

  const value = useMemo<LearnerSessionValue>(
    () => ({
      status,
      storageAvailable,
      learners,
      currentLearner,
      lookAround,
      activeLearner,
      chooseLearner,
      addLearner,
      removeLearner,
      startLookAround,
      returnToPicker,
      reloadLearners,
      setLearnerReadingLevel,
    }),
    [status, storageAvailable, learners, currentLearner, lookAround, activeLearner, chooseLearner, addLearner, removeLearner, startLookAround, returnToPicker, reloadLearners, setLearnerReadingLevel],
  );

  return <LearnerSessionContext.Provider value={value}>{children}</LearnerSessionContext.Provider>;
}
