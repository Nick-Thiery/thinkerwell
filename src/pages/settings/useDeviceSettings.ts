import { useCallback, useEffect, useRef, useState } from 'react';
import { useLearnerSession } from '../../session';
import { DEFAULT_SETTINGS, getStore, type DeviceSettings } from '../../storage';

/** Which part of the settings a change was to: its top-level key. */
export type SettingKey = keyof DeviceSettings;

export interface DeviceSettingsState {
  /** The device's settings; null while they load. The defaults where this browser window can't save. */
  settings: DeviceSettings | null;
  /** False where this browser window has no storage: the controls are shown but disabled. */
  canSave: boolean;
  /** The setting whose last change didn't save (it is put back as it was), or null. */
  failed: SettingKey | null;
  /** Shows the change at once, then saves it on the device; puts it back if saving fails. */
  save: (patch: Partial<DeviceSettings>) => Promise<void>;
}

/**
 * The Settings page's copy of the device settings. Saved even while looking
 * around: this sets up the device, it isn't a learner's work (phase 5,
 * decision 3).
 */
export function useDeviceSettings(): DeviceSettingsState {
  const { storageAvailable } = useLearnerSession();
  const [settings, setSettingsState] = useState<DeviceSettings | null>(storageAvailable ? null : DEFAULT_SETTINGS);
  const [failed, setFailed] = useState<SettingKey | null>(null);
  const alive = useRef(true);
  // The same value, readable in save() without waiting for a render.
  const current = useRef(settings);
  const setSettings = useCallback((next: DeviceSettings | null) => {
    current.current = next;
    setSettingsState(next);
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!storageAvailable) return undefined;
    void getStore()
      .then((store) => store.getSettings())
      .then(
        (stored) => {
          if (alive.current) setSettings(stored);
        },
        () => {
          if (alive.current) setSettings(DEFAULT_SETTINGS);
        },
      );
    return () => {
      alive.current = false;
    };
  }, [storageAvailable, setSettings]);

  const save = useCallback(
    async (patch: Partial<DeviceSettings>) => {
      const key = Object.keys(patch)[0] as SettingKey | undefined;
      const before = current.current;
      if (before) setSettings({ ...before, ...patch, partner: { ...before.partner, ...patch.partner } });
      try {
        const store = await getStore();
        const saved = await store.updateSettings(patch);
        if (!alive.current) return;
        setSettings(saved);
        setFailed(null);
      } catch {
        if (!alive.current) return;
        setSettings(before);
        setFailed(key ?? null);
      }
    },
    [setSettings],
  );

  return { settings, canSave: storageAvailable, failed, save };
}
