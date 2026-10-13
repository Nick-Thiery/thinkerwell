import { useEffect, useState } from 'react';
import { gateFor, sharingOrg } from '../measurement/gate';
import { setMeasurementState } from '../measurement/track';
import { useLearnerSession } from '../session';
import { getStore, onSettingsSaved, type DeviceSettings } from '../storage';

/**
 * Tells pilot measurement who, if anyone, is being measured: the learner
 * using the device (a pilot code, like HLP-01, as their name), the device's
 * "Share pilot results" setting and its organisation code. Renders nothing.
 * With sharing off (the default) it sets nothing in motion: no code is
 * loaded, no database is made, no request is sent (src/measurement/gate.ts,
 * docs/notes/pilot-measurement.md).
 */
export function MeasurementGate() {
  const { status, storageAvailable, activeLearner } = useLearnerSession();
  const [partner, setPartner] = useState<DeviceSettings['partner'] | null>(null);

  useEffect(() => {
    if (!storageAvailable) return undefined;
    let alive = true;
    void getStore()
      .then((store) => store.getSettings())
      .then(
        (settings) => {
          if (alive) setPartner(settings.partner);
        },
        () => undefined,
      );
    const stop = onSettingsSaved((settings) => setPartner(settings.partner));
    return () => {
      alive = false;
      stop();
    };
  }, [storageAvailable]);

  useEffect(() => {
    if (status !== 'ready') return;
    setMeasurementState(sharingOrg(partner), gateFor(partner, activeLearner));
  }, [status, partner, activeLearner]);

  return null;
}
