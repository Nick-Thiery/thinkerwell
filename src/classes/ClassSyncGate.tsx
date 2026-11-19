import { useEffect, useState } from 'react';
import { useLearnerSession } from '../session';
import { getStore, onSettingsSaved } from '../storage';
import { hasClassWork } from './links';

/**
 * Starts sending online-class progress (./runner.ts) only on a device where
 * a learner joined a class, or one left and the server must be told. On every
 * other device it loads nothing and sends nothing (docs/notes/online-classes.md).
 * Renders nothing.
 */
export function ClassSyncGate() {
  const { storageAvailable } = useLearnerSession();
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (!storageAvailable) return undefined;
    let alive = true;
    void getStore()
      .then((store) => store.getSettings())
      .then(
        (settings) => alive && setNeeded(hasClassWork(settings)),
        () => undefined,
      );
    const stop = onSettingsSaved((settings) => setNeeded(hasClassWork(settings)));
    return () => {
      alive = false;
      stop();
    };
  }, [storageAvailable]);

  useEffect(() => {
    if (!needed || import.meta.env.MODE === 'test') return undefined;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import('./runner').then(
      (runner) => {
        if (!cancelled) stop = runner.startClassSync();
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [needed]);

  return null;
}
