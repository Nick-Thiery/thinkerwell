/**
 * The work file: a learner's work (or every learner's) saved from one device
 * so it can be loaded on another (Settings, "Move work to another device").
 * Nothing here goes online: the file is made in the browser and downloaded,
 * and loading reads a file the person picks. See docs/notes/device-transfer.md.
 *
 * The file is JSON:
 *
 *   {
 *     "format": "thinkerwell-work",     marker: this is a Thinkerwell work file
 *     "version": 1,                     WORK_FILE_VERSION; bump it when the shape changes
 *     "savedAt": "2026-09-28T09:00:00.000Z",
 *     "learners": [
 *       { "learner": Learner, "progress": LessonProgress[], "quizAttempts": SectionQuizRecord[] }
 *     ]
 *   }
 *
 * Left out: recordings (too big; they stay on the device), device settings,
 * and which learner is current.
 *
 * checkWorkFile() is hand-written on purpose: zod never reaches the browser
 * (CLAUDE.md, "Stack"). It treats the file as untrusted. Anything that isn't
 * exactly this shape is refused as a whole, so a bad file never changes
 * anything. It builds new, clean records from the fields it knows (extra
 * fields are dropped), and it caps every string. Records for lessons or
 * section checks this version doesn't have are left out and counted.
 */
import { STAGES } from '../content/stages';
import { LOCALE_CODE_PATTERN } from '../i18n/locales';
import {
  LEARNER_COLOURS,
  type CheckAnswer,
  type Learner,
  type LessonProgress,
  type QuizAttempt,
  type SectionId,
  type SectionQuizRecord,
  type StageId,
} from './types';

export const WORK_FILE_FORMAT = 'thinkerwell-work';
export const WORK_FILE_VERSION = 1;

/** A file bigger than this is refused before it is read. Real files are far smaller (about 50 kB for one learner who has done every lesson). */
export const MAX_WORK_FILE_BYTES = 5 * 1024 * 1024;
/** The longest answer a file may hold (about 8,000 words). No lesson answer comes near it. */
export const MAX_TEXT_LENGTH = 50_000;
/** The name form allows 30 characters; this leaves room without letting a file put a page of text on a tile. */
export const MAX_NAME_LENGTH = 60;
export const MAX_CLASS_CODE_LENGTH = 40;
const MAX_LANGUAGE_LENGTH = 35;
const MAX_ID_LENGTH = 64;
const MAX_LEARNERS = 500;
const MAX_LESSON_RECORDS = 1000;
const MAX_QUIZ_RECORDS = 100;
/** Most entries in one numbered list (reflections, planning boxes, quick-check answers). */
const MAX_INDEXED_ENTRIES = 100;
/** Most answers in one section-check attempt. */
const MAX_QUIZ_ANSWERS = 200;
const MAX_COUNT = 100_000;

export interface LearnerWork {
  learner: Learner;
  progress: LessonProgress[];
  quizAttempts: SectionQuizRecord[];
}

export interface WorkFile {
  format: typeof WORK_FILE_FORMAT;
  version: typeof WORK_FILE_VERSION;
  savedAt: string;
  learners: LearnerWork[];
}

/**
 * Why a file can't be loaded:
 *   not-work-file   not JSON, or JSON without our marker
 *   newer-version   saved by a newer Thinkerwell (a higher version)
 *   empty           nothing in it: no bytes, or no learners
 *   too-big         over MAX_WORK_FILE_BYTES
 *   damaged         our marker and version, but something doesn't fit the format
 */
export type WorkFileProblem = 'not-work-file' | 'newer-version' | 'empty' | 'too-big' | 'damaged';

export type WorkFileCheck =
  | {
      ok: true;
      file: WorkFile;
      /** Records left out because their lesson or section check isn't in this version's content. */
      skipped: number;
    }
  | { ok: false; problem: WorkFileProblem };

/** The lessons and sections this version of the course has. */
export interface KnownContent {
  lessonIds: ReadonlySet<string>;
  sectionIds: ReadonlySet<string>;
}

// --------------------------------------------------------------- making one

/** A work file for these learners, saved now. */
export function buildWorkFile(learners: readonly LearnerWork[], savedAt: Date = new Date()): WorkFile {
  return {
    format: WORK_FILE_FORMAT,
    version: WORK_FILE_VERSION,
    savedAt: savedAt.toISOString(),
    learners: learners.map((work) => ({
      learner: work.learner,
      progress: [...work.progress],
      quizAttempts: [...work.quizAttempts],
    })),
  };
}

export function serialiseWorkFile(file: WorkFile): string {
  return JSON.stringify(file);
}

/** "Amina" -> "amina", "Zoë Ali" -> "zoe-ali"; names with no Latin letters or digits become "learner". */
function nameForFile(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
  return slug || 'learner';
}

/** The day on this device's own calendar, as YYYY-MM-DD. */
function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * thinkerwell-amina-2026-09-28.json for one learner, or
 * thinkerwell-all-learners-2026-09-28.json for everyone (learnerName null).
 */
export function workFileName(learnerName: string | null, date: Date = new Date()): string {
  const who = learnerName === null ? 'all-learners' : nameForFile(learnerName);
  return `thinkerwell-${who}-${localDay(date)}.json`;
}

// ------------------------------------------------------------- checking one

/** Thrown inside the checker when the file doesn't fit; caught in checkWorkFile. */
class Damaged extends Error {}

function fail(): never {
  throw new Damaged();
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown): Json {
  return isObject(value) ? value : fail();
}

function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail();
  return value;
}

function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : fail();
}

function integer(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fail();
}

/** Control characters other than tab, line feed and carriage return. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex
const CONTROL_OR_BREAK = /[\u0000-\u001f\u007f]/;

/** A learner's answer: any text up to MAX_TEXT_LENGTH, with line breaks but no other control characters. */
function text(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH || CONTROL.test(value)) fail();
  return value;
}

/** An id: letters, digits and hyphens (learner ids are UUIDs). */
function id(value: unknown): string {
  return typeof value === 'string' && value.length <= MAX_ID_LENGTH && /^[A-Za-z0-9-]+$/.test(value) ? value : fail();
}

/** A lesson, section or question id: a lowercase slug, as in the content. */
function slug(value: unknown): string {
  return typeof value === 'string' && value.length <= MAX_ID_LENGTH && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value
    : fail();
}

/** A date exactly as the app writes it (Date.toISOString()), so dates compare as strings. */
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) fail();
  const time = new Date(value);
  return !Number.isNaN(time.getTime()) && time.toISOString() === value ? value : fail();
}

function stage(value: unknown): StageId {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value) ? (value as StageId) : fail();
}

/** A numbered list stored as an object ({ "0": ..., "2": ... }), as progress keeps reflections and the like. */
function indexed<T>(value: unknown, item: (entry: unknown) => T): Record<number, T> {
  const source = object(value);
  const keys = Object.keys(source);
  if (keys.length > MAX_INDEXED_ENTRIES) fail();
  const out: Record<number, T> = {};
  for (const key of keys) {
    if (!/^(?:0|[1-9]\d{0,2})$/.test(key)) fail();
    out[Number(key)] = item(source[key]);
  }
  return out;
}

function checkLearner(value: unknown): Learner {
  const source = object(value);
  const name = source.name;
  if (
    typeof name !== 'string' ||
    name.length > MAX_NAME_LENGTH ||
    name.trim() !== name ||
    name.length === 0 ||
    CONTROL_OR_BREAK.test(name)
  ) {
    fail();
  }
  const colour = source.colour;
  if (typeof colour !== 'string' || !(LEARNER_COLOURS as readonly string[]).includes(colour)) fail();
  const learner: Learner = {
    id: id(source.id),
    name,
    colour: colour as Learner['colour'],
    createdAt: date(source.createdAt),
  };
  if (source.classCode !== undefined) {
    const classCode = source.classCode;
    if (typeof classCode !== 'string' || classCode.length > MAX_CLASS_CODE_LENGTH || !/^[A-Za-z0-9-]+$/.test(classCode)) {
      fail();
    }
    learner.classCode = classCode;
  }
  if (source.readingLevel !== undefined) {
    const level = source.readingLevel;
    if (level !== 'standard' && level !== 'simpler') fail();
    learner.readingLevel = level;
  }
  // Added after version 1 without a new version: older Thinkerwell drops it
  // (extra fields are ignored), and older files simply don't have it.
  if (source.language !== undefined) {
    const language = source.language;
    if (typeof language !== 'string' || language.length > MAX_LANGUAGE_LENGTH || !LOCALE_CODE_PATTERN.test(language)) fail();
    learner.language = language;
  }
  return learner;
}

function checkAnswer(value: unknown): CheckAnswer {
  const source = object(value);
  if (source.type === 'choice') {
    return {
      type: 'choice',
      selected: integer(source.selected, 0, 99),
      correct: boolean(source.correct),
      tries: integer(source.tries, 1, MAX_COUNT),
    };
  }
  if (source.type === 'think') return { type: 'think', text: text(source.text) };
  return fail();
}

function checkProgress(value: unknown, learnerId: string): LessonProgress {
  const source = object(value);
  if (source.learnerId !== learnerId) fail();
  const writing = object(source.writing);
  const speak = object(source.speak);
  const watch = object(source.watch);
  const stagesDone: StageId[] = [];
  for (const done of array(source.stagesDone, STAGES.length * 4)) {
    const checked = stage(done);
    if (!stagesDone.includes(checked)) stagesDone.push(checked);
  }
  const progress: LessonProgress = {
    learnerId,
    lessonId: slug(source.lessonId),
    stagesDone,
    currentStage: stage(source.currentStage),
    warmUpAnswer: source.warmUpAnswer === null ? null : text(source.warmUpAnswer),
    checkAnswers: indexed(source.checkAnswers, checkAnswer),
    writing: {
      text: text(writing.text),
      planning: indexed(writing.planning, text),
      selfCheck: indexed(writing.selfCheck, boolean),
      exampleShown: boolean(writing.exampleShown),
    },
    speak: { practisedHow: speak.practisedHow === null ? null : integer(speak.practisedHow, 0, 99) },
    watch: {
      beforeAnswer: text(watch.beforeAnswer),
      afterAnswer: text(watch.afterAnswer),
      readInstead: boolean(watch.readInstead),
    },
    reflections: indexed(source.reflections, text),
    startedAt: date(source.startedAt),
    updatedAt: date(source.updatedAt),
    completedAt: source.completedAt === null ? null : date(source.completedAt),
  };
  // Added after version 1 without a new version: older Thinkerwell drops it
  // (extra fields are ignored), and older files simply don't have it.
  if (source.readLevel !== undefined) {
    const level = source.readLevel;
    if (level !== 'standard' && level !== 'simpler') fail();
    progress.readLevel = level;
  }
  return progress;
}

function checkAttempt(value: unknown): QuizAttempt {
  const source = object(value);
  const answersSource = object(source.answers);
  const keys = Object.keys(answersSource);
  if (keys.length > MAX_QUIZ_ANSWERS) fail();
  const answers: Record<string, number> = {};
  for (const key of keys) answers[slug(key)] = integer(answersSource[key], 0, 99);
  const total = integer(source.total, 1, 1000);
  return {
    answers,
    score: integer(source.score, 0, total),
    total,
    finishedAt: date(source.finishedAt),
  };
}

function checkQuizRecord(value: unknown, learnerId: string): SectionQuizRecord {
  const source = object(value);
  if (source.learnerId !== learnerId) fail();
  return {
    learnerId,
    sectionId: slug(source.sectionId) as SectionId,
    best: checkAttempt(source.best),
    latest: checkAttempt(source.latest),
    attempts: integer(source.attempts, 1, MAX_COUNT),
  };
}

/** Is this a file of ours, and which version? Decided before the rest is looked at, since a newer version may have another shape. */
function checkHeader(parsed: unknown): WorkFileProblem | null {
  if (!isObject(parsed) || parsed.format !== WORK_FILE_FORMAT) return 'not-work-file';
  const version = parsed.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return 'damaged';
  if (version > WORK_FILE_VERSION) return 'newer-version';
  return null;
}

/** Whether a file of this many bytes is worth reading. */
export function checkWorkFileSize(bytes: number): WorkFileProblem | null {
  if (bytes === 0) return 'empty';
  if (bytes > MAX_WORK_FILE_BYTES) return 'too-big';
  return null;
}

/**
 * Checks a work file's text thoroughly and returns clean records, or the
 * problem. Never throws. Records for lessons or sections that `known`
 * doesn't have are left out (and counted in `skipped`); anything else that
 * doesn't fit the format refuses the whole file.
 */
export function checkWorkFile(textContent: string, known: KnownContent): WorkFileCheck {
  if (textContent.length > MAX_WORK_FILE_BYTES) return { ok: false, problem: 'too-big' };
  if (textContent.trim() === '') return { ok: false, problem: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    return { ok: false, problem: 'not-work-file' };
  }
  const headerProblem = checkHeader(parsed);
  if (headerProblem) return { ok: false, problem: headerProblem };

  try {
    const source = parsed as Json;
    const savedAt = date(source.savedAt);
    const learnersSource = array(source.learners, MAX_LEARNERS);
    if (learnersSource.length === 0) return { ok: false, problem: 'empty' };

    let skipped = 0;
    const learnerIds = new Set<string>();
    const learners: LearnerWork[] = learnersSource.map((entry) => {
      const work = object(entry);
      const learner = checkLearner(work.learner);
      if (learnerIds.has(learner.id)) fail();
      learnerIds.add(learner.id);

      const lessonIds = new Set<string>();
      const progress: LessonProgress[] = [];
      for (const record of array(work.progress, MAX_LESSON_RECORDS)) {
        const checked = checkProgress(record, learner.id);
        if (lessonIds.has(checked.lessonId)) fail();
        lessonIds.add(checked.lessonId);
        if (known.lessonIds.has(checked.lessonId)) progress.push(checked);
        else skipped += 1;
      }

      const sectionIds = new Set<string>();
      const quizAttempts: SectionQuizRecord[] = [];
      for (const record of array(work.quizAttempts, MAX_QUIZ_RECORDS)) {
        const checked = checkQuizRecord(record, learner.id);
        if (sectionIds.has(checked.sectionId)) fail();
        sectionIds.add(checked.sectionId);
        if (known.sectionIds.has(checked.sectionId)) quizAttempts.push(checked);
        else skipped += 1;
      }

      return { learner, progress, quizAttempts };
    });

    return {
      ok: true,
      file: { format: WORK_FILE_FORMAT, version: WORK_FILE_VERSION, savedAt, learners },
      skipped,
    };
  } catch (error) {
    if (error instanceof Damaged) return { ok: false, problem: 'damaged' };
    // Anything else is a bug here, not in the file; still, a file must never crash the page.
    if (import.meta.env.DEV) console.error(error);
    return { ok: false, problem: 'damaged' };
  }
}
