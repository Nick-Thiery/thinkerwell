import { useEffect, useRef, useState } from 'react';
import { useLearnerSession } from '../../session';
import { getStore, type LearnerWork } from '../../storage';

export interface ClassWork {
  /** 'loading' until every learner's work has been read. */
  status: 'loading' | 'ready';
  /** Every learner on this device with their lesson work and section checks (empty where storage can't be used). */
  work: LearnerWork[];
}

/**
 * Every learner's saved work on this device, read in one go (the same read
 * as "Save my work to a file": store.exportWork()), for the class view and
 * "Print all certificates". Read again when the list of learners changes.
 * Looking around doesn't matter here: these pages are about the device,
 * like Settings, and they only read.
 */
export function useClassWork(): ClassWork {
  const session = useLearnerSession();
  const [state, setState] = useState<{ for: readonly unknown[] | null; work: LearnerWork[] }>({ for: null, work: [] });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const { status, storageAvailable, learners } = session;
  useEffect(() => {
    if (status === 'loading' || !storageAvailable) return;
    let current = true;
    void getStore()
      .then((store) => store.exportWork())
      .then(
        (work) => {
          if (current && alive.current) setState({ for: learners, work });
        },
        () => {
          if (current && alive.current) setState({ for: learners, work: [] });
        },
      );
    return () => {
      current = false;
    };
  }, [status, storageAvailable, learners]);

  if (status === 'loading') return { status: 'loading', work: [] };
  if (!storageAvailable) return { status: 'ready', work: [] };
  // Until the read for this list of learners is back, nothing is shown (never an older list).
  return state.for === learners ? { status: 'ready', work: state.work } : { status: 'loading', work: [] };
}
