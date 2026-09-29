/**
 * A language change that may not have reached IndexedDB yet. Changing the
 * language shows it at once and saves it in the background; if the page is
 * reloaded or closed before that save lands, the change would be lost. So it
 * is also kept here, in localStorage (written at once), until the save is
 * done, and the next load finishes it (LearnerSessionProvider), as the
 * lesson player does with unsaved work (./unsavedProgress.ts).
 * Holds a language code and a learner id (or null for the device), nothing
 * else. Blocked storage just means no safety net.
 */
const KEY = 'tw-language-pending';

export interface PendingLanguage {
  /** The learner it was for, or null for the device. */
  learnerId: string | null;
  code: string;
}

export function rememberPendingLanguage(pending: PendingLanguage): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // No safety net: the change is still saved in the background.
  }
}

/** Forgets it once saved, unless a newer change has been remembered since. */
export function forgetPendingLanguage(saved: PendingLanguage): void {
  try {
    const now = readPendingLanguage();
    if (now && now.learnerId === saved.learnerId && now.code === saved.code) window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}

export function readPendingLanguage(): PendingLanguage | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingLanguage>;
    if (typeof value.code !== 'string' || !(value.learnerId === null || typeof value.learnerId === 'string')) return null;
    return { learnerId: value.learnerId, code: value.code };
  } catch {
    return null;
  }
}
