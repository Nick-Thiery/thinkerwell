/**
 * The pilot measurement events: what exists, and the one strict checker both
 * sides use. The app checks every event before it is queued; the server
 * (api/events.ts) checks every batch again before it is stored. Nothing else
 * is ever accepted (docs/notes/pilot-measurement.md).
 *
 * What this list may hold is fixed by the pilot consent form
 * (`pages.pilotStudy.site` in en.json; docs/notes/partner-kit.md): how long,
 * which lessons and steps are opened and finished, answers to quick checks
 * and quizzes, the simpler reading and Listen, videos or reading instead,
 * and word COUNTS. Nothing here can carry a name, a piece of writing or a
 * recording: every text field must match a short pattern or be one of a few
 * fixed words, and there is no field that holds anything else. Add an event
 * kind or a field only after the consent form says it.
 *
 * Only ./codes (two patterns), and no zod: this file is shared with the
 * server, and the build stops if zod reaches the browser (vite.config.ts).
 */

// With the .js ending, because api/ (Vercel's Node.js, ES modules) imports this file too.
import { ORG_CODE_PATTERN, PILOT_CODE_PATTERN } from './codes.js';

export { ORG_CODE_PATTERN, PILOT_CODE_PATTERN };

/** The version of a batch's envelope ({ v, events }). */
export const BATCH_VERSION = 1;

/** The most events one request may carry. */
export const MAX_BATCH_EVENTS = 50;

/** The most bytes one request may carry. The app sends far less; the server refuses more. */
export const MAX_BODY_BYTES = 32 * 1024;

/** The lesson stages that exist (src/content). */
export const STAGES = ['read', 'write', 'speak', 'watch', 'reflect'] as const;
export type Stage = (typeof STAGES)[number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A lesson's or section's id slug (towns-near-rivers, history, dw-what-ai-is). */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,23}$/;

/** 1 January 2026 to 1 January 2100, in milliseconds: a tablet's clock may be wrong, but not absurd. */
export const MIN_TS = 1_767_225_600_000;
export const MAX_TS = 4_102_444_800_000;

/** What one field of an event's `value` may be. */
type Rule =
  | { kind: 'int'; min: number; max: number }
  | { kind: 'oneOf'; values: readonly number[] }
  | { kind: 'bool' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'slug' };

type Presence = 'required' | 'optional' | 'none';

interface TypeSpec {
  lesson: Presence;
  stage: Presence;
  /** Which stages are allowed, when a stage is. */
  stages?: readonly Stage[];
  /** Every field `value` must have, and may have: nothing else. */
  value: Record<string, Rule>;
}

const QUESTION: Rule = { kind: 'int', min: 0, max: 49 };
const OPTION: Rule = { kind: 'int', min: 0, max: 9 };
const ATTEMPT: Rule = { kind: 'int', min: 1, max: 99 };
const SECTION: Rule = { kind: 'slug' };

/**
 * Every kind of event. The names follow docs/research/MEASUREMENT_PLAN.md
 * section 4. Not here yet, because the pre/post check isn't built: its
 * answers and the confidence ratings (the consent form already covers
 * them). Never possible: any text a learner wrote, or anything about a
 * recording.
 */
export const EVENT_SPECS = {
  session_start: { lesson: 'none', stage: 'none', value: {} },
  session_end: { lesson: 'none', stage: 'none', value: {} },
  /** Every 30 seconds while the page is visible and there was input in the last 60. */
  heartbeat: { lesson: 'optional', stage: 'optional', value: {} },
  lesson_open: { lesson: 'required', stage: 'none', value: {} },
  stage_enter: { lesson: 'required', stage: 'required', value: {} },
  stage_complete: { lesson: 'required', stage: 'required', value: {} },
  lesson_complete: { lesson: 'required', stage: 'none', value: {} },
  /** A choice question in Read. `q` is the question's number in the lesson, `selected` the option's number in the content file. */
  quick_check_answer: {
    lesson: 'required',
    stage: 'none',
    value: { q: QUESTION, selected: OPTION, correct: { kind: 'bool' }, attempt: ATTEMPT },
  },
  quiz_start: { lesson: 'none', stage: 'none', value: { section: SECTION } },
  quiz_answer: {
    lesson: 'none',
    stage: 'none',
    value: { section: SECTION, q: QUESTION, selected: OPTION, correct: { kind: 'bool' }, attempt: ATTEMPT },
  },
  quiz_submit: {
    lesson: 'none',
    stage: 'none',
    value: { section: SECTION, score: { kind: 'int', min: 0, max: 50 }, total: { kind: 'int', min: 1, max: 50 }, attempt: ATTEMPT },
  },
  /** How many words are in a stage's writing, never the words. */
  writing_saved: {
    lesson: 'required',
    stage: 'required',
    stages: ['read', 'write', 'watch', 'reflect'],
    value: { words: { kind: 'int', min: 0, max: 5000 } },
  },
  /** The reading level after a switch. */
  simpler_toggle: { lesson: 'required', stage: 'none', value: { level: { kind: 'enum', values: ['standard', 'simpler'] } } },
  listen_play: { lesson: 'required', stage: 'none', value: {} },
  video_choice: { lesson: 'required', stage: 'none', value: { choice: { kind: 'enum', values: ['video', 'read'] } } },
  video_play: { lesson: 'required', stage: 'none', value: {} },
  video_progress: { lesson: 'required', stage: 'none', value: { percent: { kind: 'oneOf', values: [25, 50, 75, 100] } } },
  video_fail: { lesson: 'required', stage: 'none', value: { reason: { kind: 'enum', values: ['timeout', 'offline', 'unavailable'] } } },
} as const satisfies Record<string, TypeSpec>;

export type EventType = keyof typeof EVENT_SPECS;
export const EVENT_TYPES = Object.keys(EVENT_SPECS) as EventType[];

/** What a caller says about an event; the rest (ids, codes, time) is added when it is made. */
export interface EventDetails {
  lessonId?: string;
  stage?: Stage;
  value?: Record<string, number | boolean | string>;
}

/** One event, as stored on the device, sent and stored on the server. */
export interface MeasurementEvent {
  /** A random id, so a retry never counts twice. */
  id: string;
  /** The organisation's code. */
  org: string;
  /** The learner's pilot code, never a name. */
  pilotCode: string;
  /** A random id for this device's use of sharing (not derived from the device). */
  deviceId: string;
  /** A random id for one stretch of use. */
  sessionId: string;
  type: EventType;
  lessonId?: string;
  stage?: Stage;
  value: Record<string, number | boolean | string>;
  /** When it happened, by the device's clock, in milliseconds. */
  ts: number;
  appVersion: string;
}

export interface Batch {
  v: typeof BATCH_VERSION;
  events: MeasurementEvent[];
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const EVENT_KEYS = new Set(['id', 'org', 'pilotCode', 'deviceId', 'sessionId', 'type', 'lessonId', 'stage', 'value', 'ts', 'appVersion']);

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function checkRule(rule: Rule, input: unknown): boolean {
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

function matches(pattern: RegExp, input: unknown): input is string {
  return typeof input === 'string' && input.length <= 64 && pattern.test(input);
}

/**
 * Checks one event: only the known keys, each of the right kind, with the
 * lesson, stage and value this kind of event needs and nothing more. The
 * error names the field, never its content.
 */
export function checkEvent(input: unknown, path = 'event'): Checked<MeasurementEvent> {
  const fail = (what: string): Checked<MeasurementEvent> => ({ ok: false, error: `${path}.${what}` });
  if (!isRecord(input)) return { ok: false, error: path };
  for (const key of Object.keys(input)) if (!EVENT_KEYS.has(key)) return fail(`${key} is not allowed`);
  if (!matches(UUID_PATTERN, input.id)) return fail('id');
  if (!matches(ORG_CODE_PATTERN, input.org)) return fail('org');
  if (!matches(PILOT_CODE_PATTERN, input.pilotCode)) return fail('pilotCode');
  if (!matches(UUID_PATTERN, input.deviceId)) return fail('deviceId');
  if (!matches(UUID_PATTERN, input.sessionId)) return fail('sessionId');
  if (!matches(VERSION_PATTERN, input.appVersion)) return fail('appVersion');
  if (typeof input.ts !== 'number' || !Number.isInteger(input.ts) || input.ts < MIN_TS || input.ts > MAX_TS) return fail('ts');
  const type = input.type;
  if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(EVENT_SPECS, type)) return fail('type');
  const spec: TypeSpec = EVENT_SPECS[type as EventType];

  const lesson = input.lessonId;
  if (spec.lesson === 'none' && lesson !== undefined) return fail('lessonId is not allowed');
  if (spec.lesson === 'required' && lesson === undefined) return fail('lessonId');
  if (lesson !== undefined && !matches(SLUG_PATTERN, lesson)) return fail('lessonId');

  const stage = input.stage;
  if (spec.stage === 'none' && stage !== undefined) return fail('stage is not allowed');
  if (spec.stage === 'required' && stage === undefined) return fail('stage');
  if (stage !== undefined) {
    const allowed: readonly string[] = spec.stages ?? STAGES;
    if (typeof stage !== 'string' || !allowed.includes(stage)) return fail('stage');
    if (lesson === undefined) return fail('stage needs a lessonId');
  }

  const value = input.value;
  if (!isRecord(value)) return fail('value');
  for (const key of Object.keys(value)) if (!Object.prototype.hasOwnProperty.call(spec.value, key)) return fail(`value.${key} is not allowed`);
  for (const [key, rule] of Object.entries(spec.value)) {
    if (!checkRule(rule, value[key])) return fail(`value.${key}`);
  }

  const event: MeasurementEvent = {
    id: input.id,
    org: input.org,
    pilotCode: input.pilotCode,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    type: type as EventType,
    value: { ...(value as Record<string, number | boolean | string>) },
    ts: input.ts,
    appVersion: input.appVersion,
  };
  if (lesson !== undefined) event.lessonId = lesson;
  if (stage !== undefined) event.stage = stage as Stage;
  return { ok: true, value: event };
}

/** Checks a whole request body: `{ v: 1, events: [...] }`, 1 to MAX_BATCH_EVENTS events, nothing else. */
export function checkBatch(input: unknown): Checked<Batch> {
  if (!isRecord(input)) return { ok: false, error: 'body' };
  for (const key of Object.keys(input)) if (key !== 'v' && key !== 'events') return { ok: false, error: `body.${key} is not allowed` };
  if (input.v !== BATCH_VERSION) return { ok: false, error: 'body.v' };
  const list = input.events;
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_BATCH_EVENTS) return { ok: false, error: 'body.events' };
  const events: MeasurementEvent[] = [];
  const seen = new Set<string>();
  for (const [index, item] of list.entries()) {
    const checked = checkEvent(item, `events[${index}]`);
    if (!checked.ok) return checked;
    if (seen.has(checked.value.id)) return { ok: false, error: `events[${index}].id repeats` };
    seen.add(checked.value.id);
    events.push(checked.value);
  }
  return { ok: true, value: { v: BATCH_VERSION, events } };
}
