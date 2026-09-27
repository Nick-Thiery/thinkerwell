import { useEffect, useRef, useState } from 'react';
import { getStore, progressByLessonId, type ProgressByLessonId } from '../storage';

export type LearnerProgressStatus = 'loading' | 'ready';

export interface LearnerProgressResult {
  status: LearnerProgressStatus;
  /** Empty (never loading) when `learnerId` is null: nothing is ever read from storage for "no learner". */
  progress: ProgressByLessonId;
}

const EMPTY_PROGRESS: ProgressByLessonId = new Map();

/**
 * A learner's saved progress across every lesson, as the lookup
 * src/storage/progress.ts's helpers (`findContinueTarget`, `sectionProgress`,
 * ...) take. Shared by the dashboard and the course map so both read
 * IndexedDB the same way and agree while a learner's work is loading.
 *
 * Pass `session.activeLearner?.id ?? null`: look-around never reads storage,
 * matching CLAUDE.md's "nothing is saved" rule for that mode, and
 * `activeLearner` (unlike `currentLearner`) is already null whenever
 * look-around is on, however it got turned on.
 */
interface LoadedFor {
  /** Which learnerId this state actually belongs to (null for "no learner"). */
  forId: string | null;
  status: LearnerProgressStatus;
  progress: ProgressByLessonId;
}

export function useLearnerProgress(learnerId: string | null): LearnerProgressResult {
  // Keyed by the learnerId it was loaded for, not just the latest one asked
  // for: on the very render where `learnerId` changes (switching learners,
  // or a slow load from before still resolving), `state.forId` still lags
  // behind. Reporting that stale state under the NEW id would show one
  // learner's name over another's progress for a frame, so any mismatch is
  // reported as "loading" with empty progress instead, below.
  const [state, setState] = useState<LoadedFor>(() => ({
    forId: learnerId,
    status: learnerId ? 'loading' : 'ready',
    progress: EMPTY_PROGRESS,
  }));
  // Reset to true on every (re)mount — see the matching comment in
  // LearnerSessionContext.tsx for why a cleanup-only reset breaks under
  // React's StrictMode double-invoke in dev.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!learnerId) {
      // Syncing local state from the `learnerId` prop turning null (no
      // learner, or look-around): nothing is read from storage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ forId: null, status: 'ready', progress: EMPTY_PROGRESS });
      return;
    }
    setState((prev) => (prev.forId === learnerId ? prev : { forId: learnerId, status: 'loading', progress: EMPTY_PROGRESS }));
    // Reading IndexedDB for this learner id; see the matching comment in
    // LearnerSessionContext.tsx for why this effect-and-setState shape is
    // the right one here despite the lint rule's general advice. A rejection
    // (a storage failure mid-session) still resolves to "ready" with empty
    // progress rather than leaving the page loading forever.
    void (async () => {
      try {
        const store = await getStore();
        const list = await store.listProgress(learnerId);
        if (!alive.current) return;
        setState((prev) => (prev.forId === learnerId ? { forId: learnerId, status: 'ready', progress: progressByLessonId(list) } : prev));
      } catch (error) {
        if (import.meta.env.DEV) console.error(error);
        if (!alive.current) return;
        setState((prev) => (prev.forId === learnerId ? { forId: learnerId, status: 'ready', progress: EMPTY_PROGRESS } : prev));
      }
    })();
  }, [learnerId]);

  if (state.forId !== learnerId) return { status: 'loading', progress: EMPTY_PROGRESS };
  return { status: state.status, progress: state.progress };
}
