/**
 * How work loaded from a file (./workFile.ts) combines with the work already
 * on this device. Pure functions: the store (./store.ts, importWork) reads
 * what is here, asks planImport() what to write, and writes it all in one
 * transaction. The rules, and why, are in docs/notes/device-transfer.md.
 *
 * Learners
 *   Matched by id, never by name. A learner who isn't here is added as they
 *   are in the file (name, colour, class code, reading level, language,
 *   created date), even if someone else here has the same name. A learner who is
 *   here keeps their details from this device; only their work is combined.
 *
 * Lesson work (one record per learner and lesson), when both have a record
 *   Nothing is lost. Stages done: every stage done on either side. Completed
 *   on either side stays completed, with the earlier date. Started: the
 *   earlier date. Updated: the later date (not now), so "Continue" still
 *   points where the learner last worked.
 *   Answers (warm-up, quick-check answers, writing, planning notes,
 *   Watch's before and after answers, reflections): progress keeps one
 *   updatedAt per lesson, not per answer. So for each answer, the copy in
 *   the record saved more recently wins, but only if it has text: an empty
 *   answer never replaces a written one. On an exact tie, this device wins.
 *   Current stage, how they practised speaking, self-check ticks and quick
 *   check choices follow the same "more recent record wins, if it has one"
 *   rule; a quick check's number of tries is the larger. "Example shown"
 *   and "read instead" stay true once true on either side.
 *
 * Section checks (best and latest attempt per learner and section)
 *   Best: the higher score (a tie goes to the later attempt). Latest: the
 *   later attempt. Attempts: the larger count. Both copies usually share
 *   their earlier attempts (the work came from the same place), and the
 *   record keeps no list of attempts to tell which, so adding the counts
 *   would count shared attempts twice, and loading a file again would add
 *   them again.
 *
 * Every rule gives the same answer when the result is combined with the
 * same file again, so loading a file twice changes nothing the second time.
 */
import type { CheckAnswer, Learner, LessonProgress, QuizAttempt, SectionQuizRecord } from './types';
import type { LearnerWork } from './workFile';

/** What this device already has for one learner. */
export interface LearnerOnDevice {
  learner: Learner;
  progress: readonly LessonProgress[];
  quizAttempts: readonly SectionQuizRecord[];
}

export interface ImportPlan {
  /** Learners to add (none of them is on the device yet). */
  learners: Learner[];
  /** Lesson records to write: new ones, and combined ones that differ from what is here. */
  progress: LessonProgress[];
  /** Section-check records to write, likewise. */
  quizAttempts: SectionQuizRecord[];
  summary: ImportSummary;
}

export interface ImportSummary {
  /** Learners added to this device. */
  added: Learner[];
  /** Learners already here who got some work from the file (their details as on this device). */
  updated: Learner[];
  /** Learners already here for whom the file had nothing new. */
  unchanged: Learner[];
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Plain-data equality (what IndexedDB and JSON hold), ignoring key order. */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameData(item, b[i]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord).filter((key) => aRecord[key] !== undefined);
  const bKeys = Object.keys(bRecord).filter((key) => bRecord[key] !== undefined);
  return aKeys.length === bKeys.length && aKeys.every((key) => sameData(aRecord[key], bRecord[key]));
}

/** The more recent answer if it has text, else the other one if it has text, else the more recent (empty) one. */
function pickText<T extends string | null>(recent: T, other: T): T {
  if (hasText(recent)) return recent;
  if (hasText(other)) return other;
  return recent;
}

function earlier(a: string, b: string): string {
  return a <= b ? a : b;
}

function later(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Every key of both numbered lists, in number order. */
function indexKeys(a: Record<number, unknown>, b: Record<number, unknown>): number[] {
  return [...new Set([...Object.keys(a), ...Object.keys(b)].map(Number))].sort((x, y) => x - y);
}

/** Combines two numbered lists key by key; `pick` decides a key both have. */
function mergeIndexed<T>(
  recent: Record<number, T>,
  other: Record<number, T>,
  pick: (recent: T, other: T) => T,
): Record<number, T> {
  const out: Record<number, T> = {};
  for (const key of indexKeys(recent, other)) {
    const inRecent = Object.prototype.hasOwnProperty.call(recent, key);
    const inOther = Object.prototype.hasOwnProperty.call(other, key);
    if (inRecent && inOther) out[key] = pick(recent[key]!, other[key]!);
    else out[key] = inRecent ? recent[key]! : other[key]!;
  }
  return out;
}

function mergeCheckAnswer(recent: CheckAnswer, other: CheckAnswer): CheckAnswer {
  if (recent.type === 'think' && other.type === 'think') return { type: 'think', text: pickText(recent.text, other.text) };
  if (recent.type === 'choice' && other.type === 'choice') return { ...recent, tries: Math.max(recent.tries, other.tries) };
  // The content changed the question's kind: the more recent answer fits the question as it is now.
  return recent;
}

/**
 * One learner's work on one lesson, from this device and from a file,
 * combined so nothing is lost. `device` wins an exact tie.
 */
export function mergeProgress(device: LessonProgress, file: LessonProgress): LessonProgress {
  const fileIsRecent = file.updatedAt > device.updatedAt;
  const recent = fileIsRecent ? file : device;
  const other = fileIsRecent ? device : file;
  const completedAt =
    device.completedAt && file.completedAt
      ? earlier(device.completedAt, file.completedAt)
      : (device.completedAt ?? file.completedAt);
  const merged: LessonProgress = {
    learnerId: device.learnerId,
    lessonId: device.lessonId,
    stagesDone: [...device.stagesDone, ...file.stagesDone.filter((stage) => !device.stagesDone.includes(stage))],
    currentStage: recent.currentStage,
    warmUpAnswer: pickText(recent.warmUpAnswer, other.warmUpAnswer),
    checkAnswers: mergeIndexed(recent.checkAnswers, other.checkAnswers, mergeCheckAnswer),
    writing: {
      text: pickText(recent.writing.text, other.writing.text),
      planning: mergeIndexed(recent.writing.planning, other.writing.planning, pickText),
      selfCheck: mergeIndexed(recent.writing.selfCheck, other.writing.selfCheck, (a) => a),
      exampleShown: recent.writing.exampleShown || other.writing.exampleShown,
    },
    speak: { practisedHow: recent.speak.practisedHow ?? other.speak.practisedHow },
    watch: {
      beforeAnswer: pickText(recent.watch.beforeAnswer, other.watch.beforeAnswer),
      afterAnswer: pickText(recent.watch.afterAnswer, other.watch.afterAnswer),
      readInstead: recent.watch.readInstead || other.watch.readInstead,
    },
    reflections: mergeIndexed(recent.reflections, other.reflections, pickText),
    startedAt: earlier(device.startedAt, file.startedAt),
    updatedAt: later(device.updatedAt, file.updatedAt),
    completedAt,
  };
  // The level Read was first finished at: this device's, else the file's.
  const readLevel = device.readLevel ?? file.readLevel;
  if (readLevel) merged.readLevel = readLevel;
  return merged;
}

/** The better attempt: the higher score, then the later one, then this device's. */
function betterAttempt(device: QuizAttempt, file: QuizAttempt): QuizAttempt {
  if (file.score !== device.score) return file.score > device.score ? file : device;
  return file.finishedAt > device.finishedAt ? file : device;
}

/** The later attempt; this device's on a tie. */
function laterAttempt(device: QuizAttempt, file: QuizAttempt): QuizAttempt {
  return file.finishedAt > device.finishedAt ? file : device;
}

/** One learner's section-check record, from this device and from a file, combined. */
export function mergeQuizRecord(device: SectionQuizRecord, file: SectionQuizRecord): SectionQuizRecord {
  return {
    learnerId: device.learnerId,
    sectionId: device.sectionId,
    best: betterAttempt(device.best, file.best),
    latest: laterAttempt(device.latest, file.latest),
    attempts: Math.max(device.attempts, file.attempts),
  };
}

/**
 * What to write for a checked file's learners, given what this device
 * already has for each of them (keyed by learner id; a learner missing from
 * the map isn't on the device). Only records that would change are written.
 */
export function planImport(incoming: readonly LearnerWork[], onDevice: ReadonlyMap<string, LearnerOnDevice>): ImportPlan {
  const plan: ImportPlan = { learners: [], progress: [], quizAttempts: [], summary: { added: [], updated: [], unchanged: [] } };

  for (const work of incoming) {
    const here = onDevice.get(work.learner.id);
    if (!here) {
      plan.learners.push(work.learner);
      plan.progress.push(...work.progress);
      plan.quizAttempts.push(...work.quizAttempts);
      plan.summary.added.push(work.learner);
      continue;
    }

    let changed = false;
    const progressHere = new Map(here.progress.map((record) => [record.lessonId, record]));
    for (const record of work.progress) {
      const current = progressHere.get(record.lessonId);
      const next = current ? mergeProgress(current, record) : record;
      if (current && sameData(current, next)) continue;
      plan.progress.push(next);
      changed = true;
    }
    const quizHere = new Map(here.quizAttempts.map((record) => [record.sectionId, record]));
    for (const record of work.quizAttempts) {
      const current = quizHere.get(record.sectionId);
      const next = current ? mergeQuizRecord(current, record) : record;
      if (current && sameData(current, next)) continue;
      plan.quizAttempts.push(next);
      changed = true;
    }
    (changed ? plan.summary.updated : plan.summary.unchanged).push(here.learner);
  }

  return plan;
}
