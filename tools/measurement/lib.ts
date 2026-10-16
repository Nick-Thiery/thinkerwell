// The pilot report's workings (npm run pilot:report; docs/notes/pilot-measurement.md,
// "Reading the results"): read an export from GET /api/export (CSV or JSON),
// check every row, drop repeats, place each event in time, and work out the
// usage numbers docs/research/MEASUREMENT_PLAN.md asks for, per organisation
// and overall.
//
// What comes out is only codes (organisation, pilot code, lesson, section,
// stage) and numbers. Every row is checked again here, field by field, and
// only the fields below are kept, so nothing else in a file can reach the
// report.
//
// This file can't import src/measurement/events.ts (its './codes.js' import
// is for Vercel and doesn't resolve under Node's own TypeScript), so the
// event list is repeated in REPORT_EVENTS; lib.test.ts checks it against
// EVENT_SPECS, so the two can't drift apart.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ORG_CODE_PATTERN, PILOT_CODE_PATTERN } from '../../src/measurement/codes.ts';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

export const STAGES = ['read', 'write', 'speak', 'watch', 'reflect'] as const;
export type Stage = (typeof STAGES)[number];
export const WRITING_STAGES = ['read', 'write', 'watch', 'reflect'] as const;
export type WritingStage = (typeof WRITING_STAGES)[number];

/** Heartbeats come every 30 seconds while a page is visible and there was input in the last 60 (src/measurement/measurementCollector.ts). */
export const HEARTBEAT_MINUTES = 0.5;

/**
 * Placing events in time. `ts` is the device's clock (it may be wrong) and
 * `received_at` the server's (right, but late when a device was offline: the
 * queue holds events until it is back online). Within a session the device
 * clock is consistent, so events keep their `ts` order. A session's clock is
 * trusted when its smallest (received_at - ts) is between -CLOCK_AHEAD_MS
 * (the device a little ahead) and MAX_QUEUE_DELAY_MS (sent up to two weeks
 * later, after time offline). Otherwise (a tablet whose clock was reset, or
 * is far ahead) the whole session is moved by that smallest difference, so
 * its most promptly sent event lands when the server received it: never
 * later than the truth allows, and the session's own order is kept.
 */
export const CLOCK_AHEAD_MS = 5 * 60_000;
export const MAX_QUEUE_DELAY_MS = 14 * 24 * 60 * 60_000;

/** "Active in the last week": the 7 days ending on the range's last day. */
export const LAST_WEEK_DAYS = 7;

type FieldKind =
  | { kind: 'int'; min: number; max: number }
  | { kind: 'oneOf'; values: readonly number[] }
  | { kind: 'bool' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'slug' };

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Every field an event's value may have, with what it may be (the same rules as src/measurement/events.ts). */
export const FIELDS = {
  q: { kind: 'int', min: 0, max: 49 },
  selected: { kind: 'int', min: 0, max: 9 },
  correct: { kind: 'bool' },
  attempt: { kind: 'int', min: 1, max: 99 },
  section: { kind: 'slug' },
  score: { kind: 'int', min: 0, max: 50 },
  total: { kind: 'int', min: 1, max: 50 },
  words: { kind: 'int', min: 0, max: 5000 },
  level: { kind: 'enum', values: ['standard', 'simpler'] },
  choice: { kind: 'enum', values: ['video', 'read'] },
  percent: { kind: 'oneOf', values: [25, 50, 75, 100] },
  reason: { kind: 'enum', values: ['timeout', 'offline', 'unavailable'] },
} as const satisfies Record<string, FieldKind>;
export type Field = keyof typeof FIELDS;

interface ReportEventSpec {
  lesson: boolean;
  stage: boolean;
  stages?: readonly Stage[];
  value: readonly Field[];
}

/** Every kind of event: whether it needs a lesson and a stage, and its value's fields. Checked against EVENT_SPECS by lib.test.ts. */
export const REPORT_EVENTS = {
  session_start: { lesson: false, stage: false, value: [] },
  session_end: { lesson: false, stage: false, value: [] },
  heartbeat: { lesson: false, stage: false, value: [] },
  lesson_open: { lesson: true, stage: false, value: [] },
  stage_enter: { lesson: true, stage: true, value: [] },
  stage_complete: { lesson: true, stage: true, value: [] },
  lesson_complete: { lesson: true, stage: false, value: [] },
  quick_check_answer: { lesson: true, stage: false, value: ['q', 'selected', 'correct', 'attempt'] },
  quiz_start: { lesson: false, stage: false, value: ['section'] },
  quiz_answer: { lesson: false, stage: false, value: ['section', 'q', 'selected', 'correct', 'attempt'] },
  quiz_submit: { lesson: false, stage: false, value: ['section', 'score', 'total', 'attempt'] },
  writing_saved: { lesson: true, stage: true, stages: WRITING_STAGES, value: ['words'] },
  simpler_toggle: { lesson: true, stage: false, value: ['level'] },
  listen_play: { lesson: true, stage: false, value: [] },
  video_choice: { lesson: true, stage: false, value: ['choice'] },
  video_play: { lesson: true, stage: false, value: [] },
  video_progress: { lesson: true, stage: false, value: ['percent'] },
  video_fail: { lesson: true, stage: false, value: ['reason'] },
} as const satisfies Record<string, ReportEventSpec>;
export type ReportEventType = keyof typeof REPORT_EVENTS;

export interface EventValue {
  q?: number;
  selected?: number;
  correct?: boolean;
  attempt?: number;
  section?: string;
  score?: number;
  total?: number;
  words?: number;
  level?: 'standard' | 'simpler';
  choice?: 'video' | 'read';
  percent?: number;
  reason?: 'timeout' | 'offline' | 'unavailable';
}

/** One checked event. Nothing but codes, ids, times and the fields above. */
export interface PilotEvent {
  id: string;
  org: string;
  pilotCode: string;
  deviceId: string;
  sessionId: string;
  type: ReportEventType;
  lessonId: string | null;
  stage: Stage | null;
  value: EventValue;
  /** The device's clock, in milliseconds. */
  ts: number;
  /** The server's clock, in milliseconds. */
  receivedAt: number;
  /** Our best estimate of when it happened (see CLOCK_AHEAD_MS). */
  time: number;
}

/** A row as it comes out of a file, before it is checked. */
export type RawRow = Record<string, unknown>;

// ---------------------------------------------------------------- reading files

/** Splits CSV text into rows of cells (RFC 4180: quotes, doubled quotes, line breaks inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        cell += char;
      }
      i += 1;
      continue;
    }
    if (char === '"' && cell === '') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
    i += 1;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => !(cells.length === 1 && cells[0] === ''));
}

/** The export prefixes a cell starting with =, +, -, @ with a quote so a spreadsheet never runs it (api/_lib/export.ts): undo that. */
function unguard(cell: string): string {
  return /^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell;
}

function cellValue(cell: string): unknown {
  if (cell === '') return undefined;
  if (cell === 'true') return true;
  if (cell === 'false') return false;
  if (/^-?\d+$/.test(cell)) return Number(cell);
  return cell;
}

/** Rows from the export's CSV: the `value` column (JSON), or the v_<key> columns if it is missing. */
export function rowsFromCsv(text: string): RawRow[] {
  const [header, ...lines] = parseCsv(text);
  if (!header) return [];
  const columns = header.map((name) => name.trim());
  const rows: RawRow[] = [];
  for (const cells of lines) {
    const row: RawRow = {};
    const fromColumns: Record<string, unknown> = {};
    columns.forEach((name, index) => {
      const cell = unguard(cells[index] ?? '');
      if (name.startsWith('v_')) {
        const parsed = cellValue(cell);
        if (parsed !== undefined) fromColumns[name.slice(2)] = parsed;
      } else if (name === 'value') {
        if (cell === '') return;
        try {
          row.value = JSON.parse(cell) as unknown;
        } catch {
          row.value = null; // not understood: the row is skipped
        }
      } else {
        row[name] = cell === '' ? null : cell;
      }
    });
    if (!('value' in row)) row.value = fromColumns;
    rows.push(row);
  }
  return rows;
}

/** Rows from the export's JSON (an array of rows). */
export function rowsFromJson(text: string): RawRow[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) throw new Error('The JSON export should be a list of rows.');
  return parsed.map((item) => (typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as RawRow) : {}));
}

/** Reads one export file, CSV or JSON (by its ending, else by its first character). */
export function readExport(file: string): RawRow[] {
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!text.trim()) return [];
  const json = /\.json$/i.test(file) || (!/\.csv$/i.test(file) && text.trimStart().startsWith('['));
  return json ? rowsFromJson(text) : rowsFromCsv(text);
}

// ---------------------------------------------------------------- checking rows

function fits(rule: FieldKind, input: unknown): boolean {
  switch (rule.kind) {
    case 'int':
      return typeof input === 'number' && Number.isInteger(input) && input >= rule.min && input <= rule.max;
    case 'oneOf':
      return typeof input === 'number' && rule.values.includes(input);
    case 'bool':
      return typeof input === 'boolean';
    case 'enum':
      return typeof input === 'string' && rule.values.includes(input);
    case 'slug':
      return typeof input === 'string' && SLUG_PATTERN.test(input);
  }
}

function text(input: unknown): string | null {
  return typeof input === 'string' && input.length <= 64 ? input : null;
}

function time(input: unknown): number | null {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(input)) return null;
  const ms = Date.parse(input);
  return Number.isNaN(ms) ? null : ms;
}

/** Checks one row; null if anything about it is not what the export can hold. */
export function checkRow(row: RawRow): Omit<PilotEvent, 'time'> | null {
  const id = text(row.id);
  const org = text(row.org);
  const pilotCode = text(row.pilot_code);
  const deviceId = text(row.device_id);
  const sessionId = text(row.session_id);
  const type = text(row.type);
  if (!id || !UUID_PATTERN.test(id)) return null;
  if (!org || !ORG_CODE_PATTERN.test(org)) return null;
  if (!pilotCode || !PILOT_CODE_PATTERN.test(pilotCode)) return null;
  if (!deviceId || !UUID_PATTERN.test(deviceId) || !sessionId || !UUID_PATTERN.test(sessionId)) return null;
  if (!type || !Object.prototype.hasOwnProperty.call(REPORT_EVENTS, type)) return null;
  const spec: ReportEventSpec = REPORT_EVENTS[type as ReportEventType];

  const lessonId = row.lesson_id === null || row.lesson_id === undefined ? null : text(row.lesson_id);
  if (row.lesson_id !== null && row.lesson_id !== undefined && (!lessonId || !SLUG_PATTERN.test(lessonId))) return null;
  if (spec.lesson && !lessonId) return null;
  const stageText = row.stage === null || row.stage === undefined ? null : text(row.stage);
  if (row.stage !== null && row.stage !== undefined && !(STAGES as readonly string[]).includes(stageText ?? '')) return null;
  const stage = stageText as Stage | null;
  if (spec.stage && !stage) return null;
  if (stage && spec.stages && !spec.stages.includes(stage)) return null;
  if (stage && !lessonId) return null;

  const ts = time(row.ts);
  const receivedAt = time(row.received_at);
  if (ts === null || receivedAt === null) return null;

  const raw = row.value;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const given = raw as Record<string, unknown>;
  const allowed: readonly string[] = spec.value;
  for (const key of Object.keys(given)) if (!allowed.includes(key)) return null;
  const value: Record<string, unknown> = {};
  for (const key of spec.value) {
    if (!fits(FIELDS[key], given[key])) return null;
    value[key] = given[key];
  }
  return { id, org, pilotCode, deviceId, sessionId, type: type as ReportEventType, lessonId, stage, value, ts, receivedAt };
}

export interface Prepared {
  events: PilotEvent[];
  rows: number;
  /** Rows that were not a valid event (left out). */
  skipped: number;
  /** Rows whose id was already seen (a repeat; counted once). */
  duplicates: number;
  /** Sessions whose device clock was not trusted and were placed by when they arrived. */
  sessionsMoved: number;
}

/** Checks every row, keeps the first of each id, and estimates each event's time (see CLOCK_AHEAD_MS). Sorted by that time. */
export function prepare(rows: RawRow[]): Prepared {
  const seen = new Set<string>();
  const checked: Array<Omit<PilotEvent, 'time'>> = [];
  let skipped = 0;
  let duplicates = 0;
  for (const row of rows) {
    const event = checkRow(row);
    if (!event) {
      skipped += 1;
      continue;
    }
    if (seen.has(event.id)) {
      duplicates += 1;
      continue;
    }
    seen.add(event.id);
    checked.push(event);
  }
  const smallestGap = new Map<string, number>();
  for (const event of checked) {
    const key = sessionKey(event);
    const gap = event.receivedAt - event.ts;
    smallestGap.set(key, Math.min(smallestGap.get(key) ?? Infinity, gap));
  }
  let sessionsMoved = 0;
  const offsets = new Map<string, number>();
  for (const [key, gap] of smallestGap) {
    const trusted = gap >= -CLOCK_AHEAD_MS && gap <= MAX_QUEUE_DELAY_MS;
    offsets.set(key, trusted ? 0 : gap);
    if (!trusted) sessionsMoved += 1;
  }
  const events = checked.map((event) => ({ ...event, time: event.ts + (offsets.get(sessionKey(event)) ?? 0) }));
  events.sort(byTime);
  return { events, rows: rows.length, skipped, duplicates, sessionsMoved };
}

function sessionKey(event: { org: string; pilotCode: string; sessionId: string }): string {
  return `${event.org}/${event.pilotCode}/${event.sessionId}`;
}

function byTime(a: PilotEvent, b: PilotEvent): number {
  return a.time - b.time || a.ts - b.ts || a.receivedAt - b.receivedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// ---------------------------------------------------------------- lessons

export interface LessonInfo {
  /** The lesson file's name: L05, DW03. */
  label: string;
  order: number;
}

/** The lessons' file names and order: Our World's (content/lessons), then each preview course's. */
export function readLessons(root = ROOT): Map<string, LessonInfo> {
  const lessons = new Map<string, LessonInfo>();
  const folders = [path.join(root, 'content', 'lessons')];
  const courses = path.join(root, 'content', 'courses');
  if (existsSync(courses)) for (const course of readdirSync(courses).sort()) folders.push(path.join(courses, course, 'lessons'));
  for (const folder of folders) {
    if (!existsSync(folder)) continue;
    for (const file of readdirSync(folder).filter((name) => name.endsWith('.json')).sort()) {
      const parsed = JSON.parse(readFileSync(path.join(folder, file), 'utf8')) as { id?: unknown };
      if (typeof parsed.id === 'string') lessons.set(parsed.id, { label: file.replace(/\.json$/, ''), order: lessons.size });
    }
  }
  return lessons;
}

// ---------------------------------------------------------------- numbers

export interface Summary {
  total: number;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function summarise(values: number[]): Summary {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    total,
    median: median(values),
    mean: values.length ? total / values.length : null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

export interface Accuracy {
  correct: number;
  asked: number;
  /** 0 to 100, or null when nothing was asked. */
  percent: number | null;
}

function accuracy(correct: number, asked: number): Accuracy {
  return { correct, asked, percent: asked ? (100 * correct) / asked : null };
}

/** A date (YYYY-MM-DD) in a time zone. */
export function dateIn(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

export function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- the report

export interface LearnerRow {
  org: string;
  pilotCode: string;
  sessions: number;
  activeDays: number;
  firstDay: string;
  lastDay: string;
  activeLastWeek: boolean;
  activeMinutes: number;
  lessonMinutes: number;
  lessonsOpened: number;
  lessonsCompleted: number;
  stepsCompleted: Record<Stage, number>;
  quickCheckFirstTry: Accuracy;
  /** Total of the latest word count of each piece of writing. */
  words: number;
  simplerSwitches: number;
  listenPlays: number;
  videoPlays: number;
  readInstead: number;
}

export interface LessonRow {
  lessonId: string;
  label: string;
  learnersOpened: number;
  learnersCompleted: number;
  activeMinutes: number;
  quickCheckFirstTry: Accuracy;
  /** Switches to the simpler reading, and how many learners made one. */
  simplerSwitches: number;
  simplerLearners: number;
  /** Switches back to the standard reading. */
  standardSwitches: number;
  listenPlays: number;
  listenLearners: number;
  choseVideo: number;
  choseRead: number;
  videoPlays: number;
  /** Learners whose video reached each point (25, 50, 75, 100 percent). */
  reached: Record<'25' | '50' | '75' | '100', number>;
  failures: Record<'timeout' | 'offline' | 'unavailable', number>;
}

export interface SectionAttemptRow {
  org: string;
  pilotCode: string;
  section: string;
  submits: number;
  /** Percent of questions right on the first submitted try, and the best. */
  firstPercent: number;
  bestPercent: number;
  firstScore: string;
  bestScore: string;
}

export interface SectionSummary {
  section: string;
  learnersStarted: number;
  learnersSubmitted: number;
  first: Summary;
  best: Summary;
}

export interface WritingSummary {
  /** Pieces of writing with at least one word (latest count per learner, lesson and stage). */
  pieces: number;
  words: Summary;
}

export interface GroupReport {
  /** The organisation's code, or "all" for every organisation together. */
  org: string;
  learners: number;
  sessions: Summary;
  activeDays: Summary;
  activeMinutes: Summary;
  lessonMinutes: Summary;
  lessonsOpened: Summary;
  lessonsCompleted: Summary;
  learnersCompletedAny: number;
  stepsCompleted: Record<Stage, number>;
  quickChecks: {
    firstTry: Accuracy;
    early: Accuracy;
    late: Accuracy;
    /** Learners with first tries in at least two lessons (the only ones in early and late). */
    learnersInTrend: number;
    /** First-try accuracy in each learner's 1st, 2nd, 3rd, … lesson with a quick check. */
    byPosition: Accuracy[];
  };
  sectionChecks: SectionSummary[];
  writing: Record<WritingStage, WritingSummary>;
  retention: { learners: number; activeLastWeek: number; percent: number | null };
  perLearner: LearnerRow[];
  perLesson: LessonRow[];
  perSectionCheck: SectionAttemptRow[];
}

export interface ReportOptions {
  /** YYYY-MM-DD, inclusive, in timeZone. */
  from?: string;
  to?: string;
  timeZone: string;
  lessons: Map<string, LessonInfo>;
}

export interface Report {
  range: { from: string | null; to: string | null; lastWeekFrom: string | null; timeZone: string };
  input: { rows: number; used: number; skipped: number; duplicates: number; outsideRange: number; sessionsMoved: number };
  groups: GroupReport[];
}

const zeroStages = (): Record<Stage, number> => ({ read: 0, write: 0, speak: 0, watch: 0, reflect: 0 });

function groupBy<T>(items: Iterable<T>, key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

const learnerKey = (event: PilotEvent): string => `${event.org}/${event.pilotCode}`;

/**
 * Quick-check first tries. Each quick_check_answer says whether the chosen
 * option was right (`correct`, taken from the option's own `correct` flag in
 * the lesson file when it was chosen) and which go it was (`attempt`, 1 for
 * the first), so the content files are not needed. A question's first try
 * is its event with attempt 1 (the earliest, if a repeat slipped through);
 * a question with no attempt-1 event is left out.
 */
function firstTries(events: PilotEvent[]): Map<string, Array<{ lessonId: string; correct: boolean; time: number }>> {
  const byLearner = new Map<string, Array<{ lessonId: string; correct: boolean; time: number }>>();
  const seen = new Set<string>();
  for (const event of events) {
    if (event.type !== 'quick_check_answer' || event.value.attempt !== 1 || !event.lessonId) continue;
    const key = `${learnerKey(event)}/${event.lessonId}/${event.value.q}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byLearner.get(learnerKey(event)) ?? [];
    list.push({ lessonId: event.lessonId, correct: event.value.correct === true, time: event.time });
    byLearner.set(learnerKey(event), list);
  }
  return byLearner;
}

function groupReport(org: string, events: PilotEvent[], options: ReportOptions, lastWeekFrom: string | null): GroupReport {
  const { timeZone, lessons } = options;
  const learners = groupBy(events, learnerKey);
  const tries = firstTries(events);

  // Writing: the latest count of each piece (learner, lesson, stage).
  const latestWords = new Map<string, { learner: string; stage: WritingStage; words: number }>();
  for (const event of events) {
    if (event.type !== 'writing_saved' || !event.lessonId || !event.stage) continue;
    latestWords.set(`${learnerKey(event)}/${event.lessonId}/${event.stage}`, {
      learner: learnerKey(event),
      stage: event.stage as WritingStage,
      words: event.value.words ?? 0,
    });
  }

  const perLearner: LearnerRow[] = [];
  for (const [key, list] of learners) {
    const first = list[0]!;
    const days = new Set(list.map((event) => dateIn(event.time, timeZone)));
    const sortedDays = [...days].sort();
    const steps = zeroStages();
    for (const done of new Set(list.filter((e) => e.type === 'stage_complete').map((e) => `${e.lessonId}/${e.stage}`))) {
      steps[done.split('/')[1] as Stage] += 1;
    }
    const heartbeats = list.filter((event) => event.type === 'heartbeat');
    const learnerTries = tries.get(key) ?? [];
    perLearner.push({
      org: first.org,
      pilotCode: first.pilotCode,
      sessions: new Set(list.map((event) => event.sessionId)).size,
      activeDays: days.size,
      firstDay: sortedDays[0]!,
      lastDay: sortedDays[sortedDays.length - 1]!,
      activeLastWeek: lastWeekFrom !== null && sortedDays.some((day) => day >= lastWeekFrom),
      activeMinutes: heartbeats.length * HEARTBEAT_MINUTES,
      lessonMinutes: heartbeats.filter((event) => event.lessonId).length * HEARTBEAT_MINUTES,
      lessonsOpened: new Set(list.filter((e) => e.type === 'lesson_open').map((e) => e.lessonId)).size,
      lessonsCompleted: new Set(list.filter((e) => e.type === 'lesson_complete').map((e) => e.lessonId)).size,
      stepsCompleted: steps,
      quickCheckFirstTry: accuracy(learnerTries.filter((t) => t.correct).length, learnerTries.length),
      words: [...latestWords.values()].filter((piece) => piece.learner === key).reduce((sum, piece) => sum + piece.words, 0),
      simplerSwitches: list.filter((e) => e.type === 'simpler_toggle' && e.value.level === 'simpler').length,
      listenPlays: list.filter((e) => e.type === 'listen_play').length,
      videoPlays: list.filter((e) => e.type === 'video_play').length,
      readInstead: list.filter((e) => e.type === 'video_choice' && e.value.choice === 'read').length,
    });
  }
  perLearner.sort((a, b) => (a.org + a.pilotCode < b.org + b.pilotCode ? -1 : 1));

  // Early and late lessons: each learner's lessons in the order they first answered a quick check in them.
  let early = { correct: 0, asked: 0 };
  let late = { correct: 0, asked: 0 };
  const positions: Array<{ correct: number; asked: number }> = [];
  let learnersInTrend = 0;
  for (const list of tries.values()) {
    const order: string[] = [];
    for (const attempt of [...list].sort((a, b) => a.time - b.time)) if (!order.includes(attempt.lessonId)) order.push(attempt.lessonId);
    order.forEach((lessonId, index) => {
      const inLesson = list.filter((t) => t.lessonId === lessonId);
      const slot = (positions[index] ??= { correct: 0, asked: 0 });
      slot.correct += inLesson.filter((t) => t.correct).length;
      slot.asked += inLesson.length;
    });
    if (order.length < 2) continue;
    learnersInTrend += 1;
    // The first half of a learner's lessons against the second half; with an odd number the middle one is in neither.
    const half = Math.floor(order.length / 2);
    const add = (into: { correct: number; asked: number }, ids: string[]) => {
      const inThese = list.filter((t) => ids.includes(t.lessonId));
      return { correct: into.correct + inThese.filter((t) => t.correct).length, asked: into.asked + inThese.length };
    };
    early = add(early, order.slice(0, half));
    late = add(late, order.slice(order.length - half));
  }
  const allTries = [...tries.values()].flat();

  // Section checks: first submitted try (by time) and the best, as a percent of the questions.
  const perSectionCheck: SectionAttemptRow[] = [];
  const submits = groupBy(
    events.filter((e) => e.type === 'quiz_submit' && e.value.section),
    (e) => `${learnerKey(e)}|${e.value.section}`,
  );
  for (const list of submits.values()) {
    const first = list[0]!;
    const percentOf = (e: PilotEvent) => (100 * (e.value.score ?? 0)) / (e.value.total ?? 1);
    const best = list.reduce((top, e) => (percentOf(e) > percentOf(top) ? e : top), first);
    perSectionCheck.push({
      org: first.org,
      pilotCode: first.pilotCode,
      section: first.value.section!,
      submits: list.length,
      firstPercent: percentOf(first),
      bestPercent: percentOf(best),
      firstScore: `${first.value.score}/${first.value.total}`,
      bestScore: `${best.value.score}/${best.value.total}`,
    });
  }
  perSectionCheck.sort((a, b) => (a.section + a.org + a.pilotCode < b.section + b.org + b.pilotCode ? -1 : 1));
  const sectionIds = [...new Set(events.filter((e) => e.type.startsWith('quiz_') && e.value.section).map((e) => e.value.section!))].sort();
  const sectionChecks: SectionSummary[] = sectionIds.map((section) => {
    const rows = perSectionCheck.filter((row) => row.section === section);
    return {
      section,
      learnersStarted: new Set(events.filter((e) => e.type === 'quiz_start' && e.value.section === section).map(learnerKey)).size,
      learnersSubmitted: rows.length,
      first: summarise(rows.map((row) => row.firstPercent)),
      best: summarise(rows.map((row) => row.bestPercent)),
    };
  });

  // Per lesson.
  const lessonEvents = groupBy(
    events.filter((e) => e.lessonId),
    (e) => e.lessonId!,
  );
  const perLesson: LessonRow[] = [];
  for (const [lessonId, list] of lessonEvents) {
    const learnersWith = (test: (e: PilotEvent) => boolean) => new Set(list.filter(test).map(learnerKey)).size;
    const lessonTries = [...tries.values()].flat().filter((t) => t.lessonId === lessonId);
    const maxPercent = new Map<string, number>();
    for (const e of list) if (e.type === 'video_progress') maxPercent.set(learnerKey(e), Math.max(maxPercent.get(learnerKey(e)) ?? 0, e.value.percent ?? 0));
    const reachedAt = (percent: number) => [...maxPercent.values()].filter((p) => p >= percent).length;
    const failed = (reason: string) => list.filter((e) => e.type === 'video_fail' && e.value.reason === reason).length;
    perLesson.push({
      lessonId,
      label: lessons.get(lessonId)?.label ?? '?',
      learnersOpened: learnersWith((e) => e.type === 'lesson_open'),
      learnersCompleted: learnersWith((e) => e.type === 'lesson_complete'),
      activeMinutes: list.filter((e) => e.type === 'heartbeat').length * HEARTBEAT_MINUTES,
      quickCheckFirstTry: accuracy(lessonTries.filter((t) => t.correct).length, lessonTries.length),
      simplerSwitches: list.filter((e) => e.type === 'simpler_toggle' && e.value.level === 'simpler').length,
      simplerLearners: learnersWith((e) => e.type === 'simpler_toggle' && e.value.level === 'simpler'),
      standardSwitches: list.filter((e) => e.type === 'simpler_toggle' && e.value.level === 'standard').length,
      listenPlays: list.filter((e) => e.type === 'listen_play').length,
      listenLearners: learnersWith((e) => e.type === 'listen_play'),
      choseVideo: list.filter((e) => e.type === 'video_choice' && e.value.choice === 'video').length,
      choseRead: list.filter((e) => e.type === 'video_choice' && e.value.choice === 'read').length,
      videoPlays: list.filter((e) => e.type === 'video_play').length,
      reached: { '25': reachedAt(25), '50': reachedAt(50), '75': reachedAt(75), '100': reachedAt(100) },
      failures: { timeout: failed('timeout'), offline: failed('offline'), unavailable: failed('unavailable') },
    });
  }
  const orderOf = (row: LessonRow) => lessons.get(row.lessonId)?.order ?? Number.MAX_SAFE_INTEGER;
  perLesson.sort((a, b) => orderOf(a) - orderOf(b) || (a.lessonId < b.lessonId ? -1 : 1));

  const stepsCompleted = zeroStages();
  for (const row of perLearner) for (const stage of STAGES) stepsCompleted[stage] += row.stepsCompleted[stage];

  const writing = Object.fromEntries(
    WRITING_STAGES.map((stage) => {
      const counts = [...latestWords.values()].filter((piece) => piece.stage === stage && piece.words > 0).map((piece) => piece.words);
      return [stage, { pieces: counts.length, words: summarise(counts) }];
    }),
  ) as Record<WritingStage, WritingSummary>;

  const activeLastWeek = perLearner.filter((row) => row.activeLastWeek).length;
  return {
    org,
    learners: perLearner.length,
    sessions: summarise(perLearner.map((row) => row.sessions)),
    activeDays: summarise(perLearner.map((row) => row.activeDays)),
    activeMinutes: summarise(perLearner.map((row) => row.activeMinutes)),
    lessonMinutes: summarise(perLearner.map((row) => row.lessonMinutes)),
    lessonsOpened: summarise(perLearner.map((row) => row.lessonsOpened)),
    lessonsCompleted: summarise(perLearner.map((row) => row.lessonsCompleted)),
    learnersCompletedAny: perLearner.filter((row) => row.lessonsCompleted > 0).length,
    stepsCompleted,
    quickChecks: {
      firstTry: accuracy(allTries.filter((t) => t.correct).length, allTries.length),
      early: accuracy(early.correct, early.asked),
      late: accuracy(late.correct, late.asked),
      learnersInTrend,
      byPosition: positions.map((slot) => accuracy(slot.correct, slot.asked)),
    },
    sectionChecks,
    writing,
    retention: { learners: perLearner.length, activeLastWeek, percent: perLearner.length ? (100 * activeLastWeek) / perLearner.length : null },
    perLearner,
    perLesson,
    perSectionCheck,
  };
}

/** The whole report: the range, what was read, and the numbers for each organisation (and for all of them, when there are several). */
export function buildReport(prepared: Prepared, options: ReportOptions): Report {
  const inRange = prepared.events.filter((event) => {
    const day = dateIn(event.time, options.timeZone);
    return (!options.from || day >= options.from) && (!options.to || day <= options.to);
  });
  const days = inRange.map((event) => dateIn(event.time, options.timeZone));
  const from = options.from ?? (days.length ? days.reduce((a, b) => (a < b ? a : b)) : null);
  const to = options.to ?? (days.length ? days.reduce((a, b) => (a > b ? a : b)) : null);
  let lastWeekFrom = to ? addDays(to, -(LAST_WEEK_DAYS - 1)) : null;
  if (lastWeekFrom && from && lastWeekFrom < from) lastWeekFrom = from;

  const byOrg = groupBy(inRange, (event) => event.org);
  const groups = [...byOrg.keys()].sort().map((org) => groupReport(org, byOrg.get(org)!, options, lastWeekFrom));
  if (byOrg.size > 1) groups.push(groupReport('all', inRange, options, lastWeekFrom));
  return {
    range: { from, to, lastWeekFrom, timeZone: options.timeZone },
    input: {
      rows: prepared.rows,
      used: inRange.length,
      skipped: prepared.skipped,
      duplicates: prepared.duplicates,
      outsideRange: prepared.events.length - inRange.length,
      sessionsMoved: prepared.sessionsMoved,
    },
    groups,
  };
}

// ---------------------------------------------------------------- printing

const num = (value: number | null, digits = 0): string => (value === null ? '-' : value.toFixed(digits).replace(/\.0+$/, ''));
const pct = (value: number | null): string => (value === null ? '-' : `${Math.round(value)}%`);
const acc = (a: Accuracy): string => (a.asked ? `${a.correct} of ${a.asked} (${pct(a.percent)})` : 'none');
const accShort = (a: Accuracy): string => (a.asked ? `${a.correct}/${a.asked} ${pct(a.percent)}` : '-');
const ordinal = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

function spread(summary: Summary, digits = 0, unit = ''): string {
  if (summary.median === null) return '-';
  return `median ${num(summary.median, 1)}${unit}, mean ${num(summary.mean, 1)}${unit}, min ${num(summary.min, digits)}, max ${num(summary.max, digits)}`;
}

/** A plain-text table with columns lined up: the first `textColumns` on the left, the numbers after them on the right. */
export function table(header: string[], rows: string[][], textColumns = 1): string[] {
  const widths = header.map((title, index) => Math.max(title.length, ...rows.map((row) => (row[index] ?? '').length)));
  const line = (cells: string[], isHeader = false) =>
    cells
      .map((cell, index) => (index < textColumns || isHeader ? cell.padEnd(widths[index]!) : cell.padStart(widths[index]!)))
      .join('  ')
      .trimEnd();
  return [line(header, true), line(widths.map((w) => '-'.repeat(w))), ...rows.map((row) => line(row))];
}

function formatGroup(group: GroupReport): string[] {
  const out: string[] = [];
  const title = group.org === 'all' ? 'All organisations' : `Organisation ${group.org}`;
  out.push(title, '='.repeat(title.length));
  out.push(`Learners (pilot codes with any event): ${group.learners}`);
  out.push(`Sessions: ${group.sessions.total} (per learner ${spread(group.sessions)})`);
  out.push(`Active days per learner: ${spread(group.activeDays)}`);
  out.push(`Active learning time: ${num(group.activeMinutes.total, 1)} min in all (per learner ${spread(group.activeMinutes, 1, ' min')})`);
  out.push(`  of it in a lesson: ${num(group.lessonMinutes.total, 1)} min (per learner ${spread(group.lessonMinutes, 1, ' min')})`);
  out.push(`Lessons opened per learner: ${spread(group.lessonsOpened)}; ${group.lessonsOpened.total} in all`);
  out.push(
    `Lessons completed per learner: ${spread(group.lessonsCompleted)}; ${group.lessonsCompleted.total} in all; ${group.learnersCompletedAny} of ${group.learners} learners finished at least one`,
  );
  out.push(`Steps completed: ${STAGES.map((stage) => `${stage} ${group.stepsCompleted[stage]}`).join(', ')}`);
  const qc = group.quickChecks;
  out.push(`Quick checks, right on the first try: ${acc(qc.firstTry)}`);
  out.push(
    `  early lessons ${acc(qc.early)}, late lessons ${acc(qc.late)} (each learner's first half of lessons against their second half; ${qc.learnersInTrend} learners with two or more)`,
  );
  if (qc.byPosition.length) {
    out.push(`  by each learner's nth lesson: ${qc.byPosition.map((a, i) => `${ordinal(i + 1)} ${accShort(a)}`).join('; ')}`);
  }
  out.push('Section checks (percent right; first submitted try, and best):');
  if (!group.sectionChecks.length) out.push('  none');
  for (const s of group.sectionChecks) {
    out.push(
      `  ${s.section}: ${s.learnersStarted} started, ${s.learnersSubmitted} finished; first median ${pct(s.first.median)} (mean ${pct(s.first.mean)}), best median ${pct(s.best.median)} (mean ${pct(s.best.mean)})`,
    );
  }
  out.push('Writing (word counts only; the latest count of each piece with any words):');
  for (const stage of WRITING_STAGES) {
    const w = group.writing[stage];
    out.push(`  ${stage}: pieces ${w.pieces}${w.pieces ? `, words per piece median ${num(w.words.median, 1)}, total ${w.words.total}` : ''}`);
  }
  out.push(`Retention: ${group.retention.activeLastWeek} of ${group.retention.learners} learners (${pct(group.retention.percent)}) active in the last week`);
  out.push('');

  out.push('Per lesson');
  out.push(
    ...table(
      ['lesson', 'id', 'opened', 'finished', 'minutes', 'first try right'],
      group.perLesson.map((row) => [
        row.label,
        row.lessonId,
        String(row.learnersOpened),
        String(row.learnersCompleted),
        num(row.activeMinutes, 1),
        accShort(row.quickCheckFirstTry),
      ]),
      2,
    ),
  );
  out.push('');
  out.push('Support and video per lesson (simpler and Listen: times, learners; reached: learners)');
  out.push(
    ...table(
      ['lesson', 'simpler', 'back', 'listen', 'video', 'read', 'plays', '25%', '50%', '75%', '100%', 'timeout', 'offline', 'unavail'],
      group.perLesson.map((row) => [
        row.label,
        `${row.simplerSwitches}, ${row.simplerLearners}`,
        String(row.standardSwitches),
        `${row.listenPlays}, ${row.listenLearners}`,
        String(row.choseVideo),
        String(row.choseRead),
        String(row.videoPlays),
        String(row.reached['25']),
        String(row.reached['50']),
        String(row.reached['75']),
        String(row.reached['100']),
        String(row.failures.timeout),
        String(row.failures.offline),
        String(row.failures.unavailable),
      ]),
    ),
  );
  out.push('');
  out.push('Per learner (for the team only: the organisation gets group numbers, never one learner\'s)');
  out.push(
    ...table(
      ['code', 'sessions', 'days', 'last day', 'minutes', 'opened', 'finished', 'steps', 'first try right', 'words', 'simpler', 'listen'],
      group.perLearner.map((row) => [
        group.org === 'all' ? `${row.org} ${row.pilotCode}` : row.pilotCode,
        String(row.sessions),
        String(row.activeDays),
        row.lastDay,
        num(row.activeMinutes, 1),
        String(row.lessonsOpened),
        String(row.lessonsCompleted),
        String(STAGES.reduce((sum, stage) => sum + row.stepsCompleted[stage], 0)),
        accShort(row.quickCheckFirstTry),
        String(row.words),
        String(row.simplerSwitches),
        String(row.listenPlays),
      ]),
    ),
  );
  if (group.perSectionCheck.length) {
    out.push('');
    out.push('Section checks per learner');
    out.push(
      ...table(
        ['code', 'section', 'tries', 'first', 'best'],
        group.perSectionCheck.map((row) => [
          group.org === 'all' ? `${row.org} ${row.pilotCode}` : row.pilotCode,
          row.section,
          String(row.submits),
          `${row.firstScore} ${pct(row.firstPercent)}`,
          `${row.bestScore} ${pct(row.bestPercent)}`,
        ]),
        2,
      ),
    );
  }
  out.push('');
  return out;
}

/** The report as plain text: codes and numbers only. */
export function formatReport(report: Report): string {
  const out: string[] = ['Thinkerwell pilot report', ''];
  const { range, input } = report;
  if (range.from && range.to) {
    out.push(`Range: ${range.from} to ${range.to} (dates in ${range.timeZone}). Last week: ${range.lastWeekFrom} to ${range.to}.`);
  }
  out.push(
    `Rows read: ${input.rows}; events used: ${input.used}; repeats dropped: ${input.duplicates}; rows not understood: ${input.skipped}; outside the range: ${input.outsideRange}.`,
  );
  if (input.sessionsMoved) out.push(`Sessions with a wrong device clock, placed by when they arrived: ${input.sessionsMoved}.`);
  out.push('');
  if (!report.groups.length) {
    out.push('No events to report.');
    return `${out.join('\n')}\n`;
  }
  for (const group of report.groups) out.push(...formatGroup(group));
  return `${out.join('\n').trimEnd()}\n`;
}

// ---------------------------------------------------------------- spreadsheets

/** A CSV cell; a cell that could start a formula is prefixed, as the export does. */
export function csvCell(input: string | number | boolean | null): string {
  if (input === null) return '';
  let cell = typeof input === 'number' ? String(Math.round(input * 100) / 100) : String(input);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function csv(header: string[], rows: Array<Array<string | number | boolean | null>>): string {
  return `${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

/** The tables a spreadsheet can open: per learner, per lesson, per learner and section check. One row per organisation (not "all"). */
export function csvTables(report: Report): Record<string, string> {
  const groups = report.groups.filter((group) => group.org !== 'all');
  const learners = groups.flatMap((group) => group.perLearner);
  const lessons = groups.flatMap((group) => group.perLesson.map((row) => ({ org: group.org, row })));
  const sections = groups.flatMap((group) => group.perSectionCheck);
  return {
    'pilot-learners.csv': csv(
      [
        'org',
        'pilot_code',
        'sessions',
        'active_days',
        'first_day',
        'last_day',
        'active_last_week',
        'active_minutes',
        'lesson_minutes',
        'lessons_opened',
        'lessons_completed',
        ...STAGES.map((stage) => `steps_${stage}`),
        'quick_check_first_try_right',
        'quick_check_first_tries',
        'quick_check_first_try_percent',
        'words',
        'simpler_switches',
        'listen_plays',
        'video_plays',
        'read_instead',
      ],
      learners.map((row) => [
        row.org,
        row.pilotCode,
        row.sessions,
        row.activeDays,
        row.firstDay,
        row.lastDay,
        row.activeLastWeek,
        row.activeMinutes,
        row.lessonMinutes,
        row.lessonsOpened,
        row.lessonsCompleted,
        ...STAGES.map((stage) => row.stepsCompleted[stage]),
        row.quickCheckFirstTry.correct,
        row.quickCheckFirstTry.asked,
        row.quickCheckFirstTry.percent,
        row.words,
        row.simplerSwitches,
        row.listenPlays,
        row.videoPlays,
        row.readInstead,
      ]),
    ),
    'pilot-lessons.csv': csv(
      [
        'org',
        'lesson',
        'lesson_id',
        'learners_opened',
        'learners_finished',
        'active_minutes',
        'quick_check_first_try_right',
        'quick_check_first_tries',
        'quick_check_first_try_percent',
        'simpler_switches',
        'simpler_learners',
        'standard_switches',
        'listen_plays',
        'listen_learners',
        'chose_video',
        'chose_read_instead',
        'video_plays',
        'reached_25',
        'reached_50',
        'reached_75',
        'reached_100',
        'fail_timeout',
        'fail_offline',
        'fail_unavailable',
      ],
      lessons.map(({ org, row }) => [
        org,
        row.label,
        row.lessonId,
        row.learnersOpened,
        row.learnersCompleted,
        row.activeMinutes,
        row.quickCheckFirstTry.correct,
        row.quickCheckFirstTry.asked,
        row.quickCheckFirstTry.percent,
        row.simplerSwitches,
        row.simplerLearners,
        row.standardSwitches,
        row.listenPlays,
        row.listenLearners,
        row.choseVideo,
        row.choseRead,
        row.videoPlays,
        row.reached['25'],
        row.reached['50'],
        row.reached['75'],
        row.reached['100'],
        row.failures.timeout,
        row.failures.offline,
        row.failures.unavailable,
      ]),
    ),
    'pilot-section-checks.csv': csv(
      ['org', 'pilot_code', 'section', 'submits', 'first_percent', 'best_percent'],
      sections.map((row) => [row.org, row.pilotCode, row.section, row.submits, row.firstPercent, row.bestPercent]),
    ),
  };
}
