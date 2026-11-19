/**
 * Online classes (docs/notes/online-classes.md): what a device sends to
 * /api/classes and what the class views read back. Shared by the app and
 * the server (api/_lib/classes.ts), so both check the same shapes. Pure,
 * with no imports but the course list, and checked by hand: the browser
 * never runs zod.
 *
 * What leaves a device, and only for a learner who tapped "Join class"
 * with a code an organisation made: the name they use on the device (it
 * may be a nickname), their language and reading level, which lessons and
 * steps they have finished and when, and how many times they tried each
 * section check. Never their writing, answers, scores or recordings.
 */
import { COURSES, DEFAULT_COURSE_ID } from '../content/courses.js';

/** A class's join code, made by the server: three letters or digits, a hyphen, three more ("K7M-Q4P"). */
export const CLASS_CODE_PATTERN = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;
/** Letters and digits a class code is made from: no 0, O, 1, I or L, which are easy to mix up. */
export const CLASS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const STAGE_IDS = ['read', 'write', 'speak', 'watch', 'reflect'] as const;
export type SyncStage = (typeof STAGE_IDS)[number];

export const COURSE_IDS: readonly string[] = [DEFAULT_COURSE_ID, ...COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID).map((course) => course.id)];

export const MAX_NICKNAME = 60;
export const MAX_CLASS_NAME = 80;
export const MAX_LEARNERS_PER_SYNC = 30;
export const MAX_PROGRESS_PER_LEARNER = 200;
export const MAX_CHECKS_PER_LEARNER = 60;
export const MAX_DAYS_PER_LEARNER = 120;
/** The most a sync request may be, in bytes (about 30 learners with every lesson). */
export const MAX_SYNC_BYTES = 600_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SECRET = /^[A-Za-z0-9_-]{32,64}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface SyncProgress {
  lessonId: string;
  courseId: string;
  stagesDone: SyncStage[];
  currentStage: SyncStage | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface SyncCheck {
  sectionId: string;
  attempts: number;
  lastAt: string | null;
}

/** One learner's place in a class, as their device sends it. */
export interface SyncLearner {
  /** Random, made on the device when the learner joined this class (not the device's own learner id). */
  id: string;
  /** Random, made with the id; the server keeps only its hash, so nobody else can write as this learner. */
  secret: string;
  classCode: string;
  nickname: string;
  language: string | null;
  readingLevel: 'standard' | 'simpler' | null;
  progress: SyncProgress[];
  checks: SyncCheck[];
  /** Days (YYYY-MM-DD, the device's calendar) on which the learner worked, since the last send. */
  days: string[];
}

/** A learner who stopped sharing, or was removed from the device: the server deletes everything about them. */
export interface SyncRemoval {
  id: string;
  secret: string;
}

export interface SyncRequest {
  action: 'sync';
  learners: SyncLearner[];
  removals: SyncRemoval[];
}

/**
 * What happened to each learner: saved; `removed` (the teacher took them out
 * of the class, or the class was closed: stop sharing); `forbidden` (the
 * id belongs to someone else: make a new id and join again); `unknown-class`
 * (no such open class).
 */
export type SyncOutcome = 'saved' | 'removed' | 'forbidden' | 'unknown-class';

export interface SyncResponse {
  results: Record<string, SyncOutcome>;
}

/** What /api/classes?action=lookup says about a class code. */
export interface ClassLookup {
  className: string;
  orgName: string;
}

// ---------------------------------------------------------------------------
// What the class views read (teachers, organisations, the admin dashboard).

export interface ViewProgress {
  lessonId: string;
  courseId: string;
  stagesDone: SyncStage[];
  currentStage: SyncStage | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface ViewLearner {
  id: string;
  /** The name on the device for a teacher or organisation; "Learner 3" style numbers on the admin dashboard, which never gets names. */
  name: string | null;
  number: number;
  language: string | null;
  readingLevel: 'standard' | 'simpler' | null;
  joinedAt: string;
  lastActiveAt: string | null;
  progress: ViewProgress[];
  checks: Array<{ sectionId: string; attempts: number }>;
}

export interface ClassDetail {
  id: string;
  name: string;
  code: string;
  orgName: string;
  createdAt: string;
  archived: boolean;
  learners: ViewLearner[];
}

export interface ClassSummary {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  archived: boolean;
  learners: number;
  activeThisWeek: number;
  lessonsFinished: number;
}

export interface ProgramOverview {
  id: string;
  name: string;
  classes: ClassSummary[];
}

export interface OrgSummary {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  classes: number;
  learners: number;
  activeThisWeek: number;
  lessonsFinished: number;
}

export interface WeekPoint {
  /** The Monday the week starts on (YYYY-MM-DD, UTC). */
  week: string;
  newLearners: number;
  activeLearners: number;
  lessonsFinished: number;
}

export interface AdminStats {
  generatedAt: string;
  totals: {
    orgs: number;
    classes: number;
    learners: number;
    active7: number;
    active30: number;
    lessonsStarted: number;
    lessonsFinished: number;
    stagesDone: number;
    checksTried: number;
  };
  weeks: WeekPoint[];
  courses: Array<{
    courseId: string;
    learners: number;
    lessonsStarted: number;
    lessonsFinished: number;
  }>;
  languages: Array<{ language: string; learners: number }>;
  readingLevels: Array<{ level: string; learners: number }>;
  /** Of the lessons learners opened, how many reached each step. */
  stages: Array<{ stage: SyncStage; lessons: number }>;
  /** Lessons most often started and left unfinished (at least three starts). */
  dropOff: Array<{
    lessonId: string;
    courseId: string;
    started: number;
    finished: number;
  }>;
  /** Learners who joined 14 to 90 days ago, and how many of them came back a week or more after joining. */
  retention: { cohort: number; returned: number };
  /** How many lessons each learner has finished, in bands. */
  finishedBands: Array<{ band: string; learners: number }>;
  orgs: OrgSummary[];
}

// ---------------------------------------------------------------------------
// Checking what a device sent (the server does this; the app's tests too).

function isString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isoOrNull(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > 40) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function checkProgress(value: unknown): SyncProgress | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!isString(v.lessonId, 64) || !SLUG.test(v.lessonId)) return null;
  if (!isString(v.courseId, 64) || !COURSE_IDS.includes(v.courseId)) return null;
  if (!Array.isArray(v.stagesDone) || v.stagesDone.length > STAGE_IDS.length) return null;
  const stagesDone: SyncStage[] = [];
  for (const stage of v.stagesDone) {
    if (!STAGE_IDS.includes(stage as SyncStage) || stagesDone.includes(stage as SyncStage)) return null;
    stagesDone.push(stage as SyncStage);
  }
  const currentStage = v.currentStage === null || v.currentStage === undefined ? null : STAGE_IDS.includes(v.currentStage as SyncStage) ? (v.currentStage as SyncStage) : undefined;
  if (currentStage === undefined) return null;
  const startedAt = isoOrNull(v.startedAt);
  const updatedAt = isoOrNull(v.updatedAt);
  const completedAt = isoOrNull(v.completedAt);
  if (startedAt === undefined || updatedAt === undefined || completedAt === undefined) return null;
  return {
    lessonId: v.lessonId,
    courseId: v.courseId,
    stagesDone,
    currentStage,
    startedAt,
    updatedAt,
    completedAt,
  };
}

function checkCheck(value: unknown): SyncCheck | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!isString(v.sectionId, 64) || !SLUG.test(v.sectionId)) return null;
  if (typeof v.attempts !== 'number' || !Number.isInteger(v.attempts) || v.attempts < 0 || v.attempts > 10_000) return null;
  const lastAt = isoOrNull(v.lastAt);
  if (lastAt === undefined) return null;
  return { sectionId: v.sectionId, attempts: v.attempts, lastAt };
}

/** A learner as the device sent it, checked field by field; null if anything is wrong. */
export function checkSyncLearner(value: unknown): SyncLearner | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const allowed = new Set(['id', 'secret', 'classCode', 'nickname', 'language', 'readingLevel', 'progress', 'checks', 'days']);
  if (Object.keys(v).some((key) => !allowed.has(key))) return null;
  if (!isString(v.id, 36) || !UUID.test(v.id)) return null;
  if (!isString(v.secret, 64) || !SECRET.test(v.secret)) return null;
  if (!isString(v.classCode, 7) || !CLASS_CODE_PATTERN.test(v.classCode)) return null;
  if (typeof v.nickname !== 'string') return null;
  const nickname = v.nickname.trim().replace(/\s+/g, ' ');
  if (nickname.length < 1 || nickname.length > MAX_NICKNAME) return null;
  const language = v.language === null || v.language === undefined ? null : isString(v.language, 16) && LANGUAGE.test(v.language) ? v.language : undefined;
  if (language === undefined) return null;
  const readingLevel = v.readingLevel === null || v.readingLevel === undefined ? null : v.readingLevel === 'standard' || v.readingLevel === 'simpler' ? v.readingLevel : undefined;
  if (readingLevel === undefined) return null;
  if (!Array.isArray(v.progress) || v.progress.length > MAX_PROGRESS_PER_LEARNER) return null;
  const progress: SyncProgress[] = [];
  const seen = new Set<string>();
  for (const item of v.progress) {
    const checked = checkProgress(item);
    if (!checked || seen.has(checked.lessonId)) return null;
    seen.add(checked.lessonId);
    progress.push(checked);
  }
  if (!Array.isArray(v.checks) || v.checks.length > MAX_CHECKS_PER_LEARNER) return null;
  const checks: SyncCheck[] = [];
  const seenChecks = new Set<string>();
  for (const item of v.checks) {
    const checked = checkCheck(item);
    if (!checked || seenChecks.has(checked.sectionId)) return null;
    seenChecks.add(checked.sectionId);
    checks.push(checked);
  }
  const daysIn = v.days ?? [];
  if (!Array.isArray(daysIn) || daysIn.length > MAX_DAYS_PER_LEARNER) return null;
  const days: string[] = [];
  for (const day of daysIn) {
    if (!isString(day, 10) || !DAY.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) return null;
    if (!days.includes(day)) days.push(day);
  }
  return {
    id: v.id,
    secret: v.secret,
    classCode: v.classCode,
    nickname,
    language,
    readingLevel,
    progress,
    checks,
    days,
  };
}

/** A whole sync request, checked; null if anything in it is wrong (nothing is saved then). */
export function checkSyncRequest(value: unknown): SyncRequest | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.action !== 'sync') return null;
  if (!Array.isArray(v.learners) || v.learners.length > MAX_LEARNERS_PER_SYNC) return null;
  const removalsIn = v.removals ?? [];
  if (!Array.isArray(removalsIn) || removalsIn.length > MAX_LEARNERS_PER_SYNC) return null;
  const learners: SyncLearner[] = [];
  const ids = new Set<string>();
  for (const item of v.learners) {
    const checked = checkSyncLearner(item);
    if (!checked || ids.has(checked.id)) return null;
    ids.add(checked.id);
    learners.push(checked);
  }
  const removals: SyncRemoval[] = [];
  for (const item of removalsIn) {
    if (!item || typeof item !== 'object') return null;
    const r = item as Record<string, unknown>;
    if (!isString(r.id, 36) || !UUID.test(r.id) || !isString(r.secret, 64) || !SECRET.test(r.secret)) return null;
    removals.push({ id: r.id, secret: r.secret });
  }
  return { action: 'sync', learners, removals };
}

/** A class or organisation name someone typed: trimmed, inner spaces folded; null if empty or too long. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= MAX_CLASS_NAME ? name : null;
}

/** A class code someone typed, made tidy ("k7m q4p" → "K7M-Q4P"); null if it can't be one. */
export function normaliseClassCode(value: string): string | null {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length !== 6) return null;
  const code = `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return CLASS_CODE_PATTERN.test(code) ? code : null;
}
