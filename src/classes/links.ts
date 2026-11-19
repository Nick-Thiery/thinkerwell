/**
 * Joining an online class, stopping, and what a learner's device sends
 * (docs/notes/online-classes.md). The saved state is the device settings'
 * `classLinks` and `classRemovals` (src/storage/types.ts), changed only in
 * one transaction at a time (store.changeSettings).
 */
import { DEFAULT_COURSE_ID, previewCourseOfLesson } from '../content/courses';
import type { ClassLink, Learner, LessonProgress, SectionQuizRecord, ThinkerwellStore } from '../storage';
import { MAX_DAYS_PER_LEARNER, MAX_NICKNAME, type SyncLearner, type SyncStage } from './protocol';

function randomBase64Url(bytes: number): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let text = '';
  for (const byte of data) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function newLinkIdentity(): { id: string; secret: string } {
  return { id: crypto.randomUUID(), secret: randomBase64Url(32) };
}

/** Joins a class: from now on this learner's progress is sent with the next sync. */
export async function joinClass(store: ThinkerwellStore, learnerId: string, found: { code: string; className: string; orgName: string }, now = new Date()): Promise<ClassLink> {
  const link: ClassLink = {
    ...newLinkIdentity(),
    code: found.code,
    className: found.className,
    orgName: found.orgName,
    joinedAt: now.toISOString(),
  };
  await store.changeSettings((current) => {
    const old = current.classLinks?.[learnerId];
    // Joining another class: the server forgets the old one.
    const removals = old && !old.ended ? [...(current.classRemovals ?? []), { id: old.id, secret: old.secret }] : current.classRemovals;
    return {
      classLinks: { ...current.classLinks, [learnerId]: link },
      classRemovals: removals,
    };
  });
  await store.updateLearner(learnerId, { classCode: found.code });
  return link;
}

/** Stops sharing: nothing more is sent, and the server is told to delete what it has. */
export async function leaveClass(store: ThinkerwellStore, learnerId: string): Promise<void> {
  await store.changeSettings((current) => {
    const links = { ...current.classLinks };
    const old = links[learnerId];
    delete links[learnerId];
    const removals = old && !old.ended ? [...(current.classRemovals ?? []), { id: old.id, secret: old.secret }] : current.classRemovals;
    return { classLinks: links, classRemovals: removals };
  });
}

/** True when this device has anything to send: someone in a class, or a removal to tell the server about. */
export function hasClassWork(settings: { classLinks?: Record<string, ClassLink>; classRemovals?: unknown[] }): boolean {
  return Object.values(settings.classLinks ?? {}).some((link) => !link.ended) || (settings.classRemovals?.length ?? 0) > 0;
}

/** YYYY-MM-DD on this device's calendar: a key, never shown. */
export function localDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const STAGES: readonly SyncStage[] = ['read', 'write', 'speak', 'watch', 'reflect'];

/**
 * What the device sends for one learner: the name on the device, language,
 * reading level, each lesson's finished steps and times, how many times each
 * section check was tried, and the days they worked since `since`. Nothing
 * they wrote, chose or recorded.
 */
export function snapshotFor(
  learner: Learner,
  link: ClassLink,
  progress: readonly LessonProgress[],
  quizzes: readonly SectionQuizRecord[],
  preferredLevel: 'standard' | 'simpler' | null,
): SyncLearner {
  const since = link.lastSentAt ?? null;
  const days = new Set<string>();
  const addDay = (iso: string | null | undefined) => {
    if (!iso || (since && iso <= since)) return;
    const d = localDay(iso);
    if (d) days.add(d);
  };
  for (const p of progress) {
    addDay(p.startedAt);
    addDay(p.updatedAt);
    addDay(p.completedAt);
  }
  for (const q of quizzes) addDay(q.latest.finishedAt);
  return {
    id: link.id,
    secret: link.secret,
    classCode: link.code,
    nickname: learner.name.trim().replace(/\s+/g, ' ').slice(0, MAX_NICKNAME) || '?',
    language: learner.language ?? null,
    readingLevel: learner.readingLevel ?? preferredLevel,
    progress: progress
      .filter((p) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(p.lessonId))
      .slice(0, 200)
      .map((p) => ({
        lessonId: p.lessonId,
        courseId: previewCourseOfLesson(p.lessonId)?.id ?? DEFAULT_COURSE_ID,
        stagesDone: p.stagesDone.filter((stage, i, all) => STAGES.includes(stage) && all.indexOf(stage) === i),
        currentStage: STAGES.includes(p.currentStage) ? p.currentStage : null,
        startedAt: p.startedAt || null,
        updatedAt: p.updatedAt || null,
        completedAt: p.completedAt,
      })),
    checks: quizzes.slice(0, 60).map((q) => ({
      sectionId: q.sectionId,
      attempts: q.attempts,
      lastAt: q.latest.finishedAt || null,
    })),
    days: [...days].sort().slice(-MAX_DAYS_PER_LEARNER),
  };
}

/** A fingerprint of a snapshot without its days and secret, so an unchanged learner isn't sent again. */
export function fingerprint(learner: SyncLearner): string {
  const { days: _days, secret: _secret, ...rest } = learner;
  const text = JSON.stringify(rest);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}
