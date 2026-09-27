/**
 * "Save data" (CLAUDE.md, Watch): with it on, videos are off and Watch
 * opens on the written version. The Settings page sets it for the device
 * (settings.saveData). Until someone chooses there, it follows the
 * browser's own data-saver hint (navigator.connection.saveData, the
 * Save-Data header's twin), which phones turn on with the system's data
 * saver.
 */

/** True when the browser or the operating system asks sites to save data. */
export function browserAsksToSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/** Whether videos are off on this device: the Settings choice, else the browser's hint. */
export function isSaveDataOn(choice: boolean | null): boolean {
  return choice ?? browserAsksToSaveData();
}
