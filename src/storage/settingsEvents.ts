/**
 * Lets the app hear that the device's settings were saved, without
 * re-reading them: MeasurementGate (src/app) turns pilot measurement on or
 * off as soon as an educator saves the setting. In memory only.
 */
import type { DeviceSettings } from './types';

type Listener = (settings: DeviceSettings) => void;
const listeners = new Set<Listener>();

export function onSettingsSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announceSettings(settings: DeviceSettings): void {
  for (const listener of listeners) {
    try {
      listener(settings);
    } catch {
      // A listener's failure must never fail a save.
    }
  }
}
