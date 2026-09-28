/**
 * Learners are matched by id, never by name, so a device can hold two
 * learners with the same name (most often after loading work from a file in
 * Settings: docs/notes/device-transfer.md). Their tiles then also say when
 * each was added, so they can be told apart without renaming anyone.
 */
import type { Learner } from '../storage';

function nameKey(name: string): string {
  return name.normalize('NFKC').trim().toLocaleLowerCase();
}

/** Ids of the learners whose name someone else on this device also has (ignoring case and spaces). */
export function learnersWithSameName(learners: readonly Learner[]): Set<string> {
  const byName = new Map<string, string[]>();
  for (const learner of learners) {
    const key = nameKey(learner.name);
    byName.set(key, [...(byName.get(key) ?? []), learner.id]);
  }
  return new Set([...byName.values()].filter((ids) => ids.length > 1).flat());
}

/**
 * The day a learner was added, short ("Sep 28, 2026"), or '' if the date
 * can't be read. `formatDate` is useI18n's, so it reads in the interface's
 * language.
 */
export function addedOn(
  learner: Pick<Learner, 'createdAt'>,
  formatDate: (date: Date, options: Intl.DateTimeFormatOptions) => string,
): string {
  const date = new Date(learner.createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
}
