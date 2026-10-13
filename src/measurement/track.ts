/**
 * The front door of pilot measurement (docs/notes/pilot-measurement.md): the
 * only part the rest of the app imports. About 1 kB, because it is in every
 * visit; the work is in ./measurementCollector.ts, loaded with import() only
 * when a device is set to share results.
 *
 *   track('stage_enter', { lessonId, stage });   // does nothing unless measurement is on for this learner
 *
 * Nothing is queued, nothing is sent and nothing is even downloaded unless
 * ./gate.ts says yes: a pilot code for the learner, "Share pilot results"
 * turned on in Settings, and an organisation code. `setMeasurementState` is
 * called from one place (MeasurementGate in src/app) with the answer.
 */
import { useSyncExternalStore } from 'react';
import type { EventDetails, EventType } from './events';
import { pilotCodeFor, type Gate } from './gate';
import type * as CollectorModule from './measurementCollector';

type Collector = typeof CollectorModule;

let loading: Promise<Collector> | null = null;
const load = (): Promise<Collector> => (loading ??= import('./measurementCollector'));

export interface MeasurementState {
  /** The organisation this device shares results with, or null: sharing is off. */
  org: string | null;
  /** Who is being measured now (a learner with a pilot code while sharing is on), or null. */
  gate: Gate | null;
}

let state: MeasurementState = { org: null, gate: null };
const listeners = new Set<() => void>();

/** Called by MeasurementGate whenever the setting, the organisation code or the learner changes. */
export function setMeasurementState(org: string | null, gate: Gate | null): void {
  const same =
    state.org === org && state.gate?.org === gate?.org && state.gate?.pilotCode === gate?.pilotCode;
  if (same) return;
  state = { org, gate };
  for (const listener of listeners) listener();
  // Never on, and never loaded: nothing to do (the common case).
  if (!org && !loading) return;
  void load()
    .then((collector) => collector.applyGate(org, gate))
    .catch(() => undefined);
}

export function getMeasurementState(): MeasurementState {
  return state;
}

/** For the few places that word things differently while results are shared (the privacy lines). */
export function useMeasurementState(): MeasurementState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

/** Records that something happened, if (and only if) this learner is being measured. Never throws, never waits. */
export function track(type: EventType, details?: EventDetails): void {
  const gate = state.gate;
  if (!gate) return;
  void load()
    .then((collector) => collector.record(gate, type, details))
    .catch(() => undefined);
}

/** The learner left the lesson pages. */
export function leaveLesson(): void {
  if (!state.gate) return;
  void load()
    .then((collector) => collector.leaveLesson())
    .catch(() => undefined);
}

/** A learner was removed from the device: results of theirs still waiting to be sent are deleted. */
export function forgetLearner(name: string): void {
  const code = pilotCodeFor({ name });
  if (!code || !loading) return;
  void loading.then((collector) => collector.forgetPilotCode(code)).catch(() => undefined);
}
