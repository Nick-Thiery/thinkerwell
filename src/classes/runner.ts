/**
 * Sends the progress of this device's learners who joined an online class
 * (docs/notes/online-classes.md), when there is something new and the
 * device is online: shortly after the app opens, every two minutes while it
 * is on screen, when the connection comes back, and as the page is hidden.
 * Loaded only on a device where someone joined a class (./ClassSyncGate.tsx).
 * A failed send changes nothing; the next one tries again.
 */
import { getStore, type ClassLink } from '../storage';
import { sendSync } from './client';
import { fingerprint, newLinkIdentity, snapshotFor } from './links';
import type { SyncLearner, SyncRemoval } from './protocol';

const EVERY_MS = 2 * 60_000;
const FIRST_MS = 3_000;
/** Send an unchanged learner again after this long, so their teacher sees they are still around. */
const REFRESH_MS = 3 * 86_400_000;

let running = false;

/** One sync now. Resolves to what happened, for the tests. */
export async function syncClasses(options: { keepalive?: boolean; now?: () => Date } = {}): Promise<'sent' | 'nothing' | 'failed'> {
  if (running) return 'nothing';
  running = true;
  try {
    const now = options.now ?? (() => new Date());
    const store = await getStore();
    const settings = await store.getSettings();
    const links = settings.classLinks ?? {};
    const learners = new Map((await store.listLearners()).map((learner) => [learner.id, learner]));
    const builtAt = now().toISOString();

    const sending: Array<{
      learnerId: string;
      link: ClassLink;
      snapshot: SyncLearner;
      fp: string;
    }> = [];
    const removals: SyncRemoval[] = [...(settings.classRemovals ?? [])];
    const gone: string[] = [];
    for (const [learnerId, link] of Object.entries(links)) {
      if (link.ended) continue;
      const learner = learners.get(learnerId);
      if (!learner) {
        removals.push({ id: link.id, secret: link.secret });
        gone.push(learnerId);
        continue;
      }
      const [progress, quizzes] = await Promise.all([store.listProgress(learnerId), store.listQuizRecords(learnerId)]);
      const snapshot = snapshotFor(learner, link, progress, quizzes, settings.preferredReadingLevel);
      const fp = fingerprint(snapshot);
      const stale = !link.lastSentAt || Date.parse(builtAt) - Date.parse(link.lastSentAt) > REFRESH_MS;
      if (fp !== link.lastSentHash || stale || snapshot.days.length > 0) sending.push({ learnerId, link, snapshot, fp });
    }
    if (sending.length === 0 && removals.length === 0) return 'nothing';

    let results: Record<string, string>;
    try {
      ({ results } = await sendSync(
        {
          action: 'sync',
          learners: sending.slice(0, 30).map((s) => s.snapshot),
          removals: removals.slice(0, 30),
        },
        options.keepalive,
      ));
    } catch {
      return 'failed';
    }

    const sentRemovals = new Set(removals.slice(0, 30).map((r) => r.id));
    await store.changeSettings((current) => {
      const next: Record<string, ClassLink> = { ...current.classLinks };
      for (const learnerId of gone) {
        if (next[learnerId] && sentRemovals.has(next[learnerId].id)) delete next[learnerId];
      }
      for (const { learnerId, link, fp } of sending.slice(0, 30)) {
        const saved = next[learnerId];
        // The learner left or joined another class meanwhile: leave the new state alone.
        if (!saved || saved.id !== link.id) continue;
        const outcome = results[link.id];
        if (outcome === 'saved') next[learnerId] = { ...saved, lastSentAt: builtAt, lastSentHash: fp };
        else if (outcome === 'removed' || outcome === 'unknown-class') next[learnerId] = { ...saved, ended: 'removed' };
        else if (outcome === 'forbidden') {
          // The id belongs to someone else (it came from another device): join again as a new learner.
          const { lastSentAt: _a, lastSentHash: _b, ...rest } = saved;
          next[learnerId] = { ...rest, ...newLinkIdentity() };
        }
      }
      return {
        classLinks: next,
        classRemovals: (current.classRemovals ?? []).filter((r) => !sentRemovals.has(r.id)),
      };
    });
    return 'sent';
  } catch {
    return 'failed';
  } finally {
    running = false;
  }
}

/** Starts syncing; returns a function that stops it. */
export function startClassSync(): () => void {
  const tick = () => {
    if (document.visibilityState === 'visible') void syncClasses();
  };
  const first = window.setTimeout(tick, FIRST_MS);
  const timer = window.setInterval(tick, EVERY_MS);
  const online = () => void syncClasses();
  const hidden = () => {
    if (document.visibilityState === 'hidden') void syncClasses({ keepalive: true });
  };
  window.addEventListener('online', online);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.clearTimeout(first);
    window.clearInterval(timer);
    window.removeEventListener('online', online);
    document.removeEventListener('visibilitychange', hidden);
  };
}
