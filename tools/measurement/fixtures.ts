// A small made-up pilot export for the pilot report's tests (lib.test.ts) and
// for trying the command (fixtures/sample-export.csv is made from it). Codes
// like TST-01 and the organisations test-org and other-org are invented;
// nothing here comes from a real learner.
//
// What it holds, and why:
// - TST-01 (test-org): finishes L01 with every kind of support and video
//   event, then on a later day does L02 and the history check twice. One
//   heartbeat arrives twice (a retry), and must count once.
// - TST-02 (test-org): one session offline (sent two days later: its own
//   clock is right and is trusted), then one on a tablet whose clock was
//   reset to January (placed by when it arrived, so L04 comes after L01).
// - TST-03 (test-org): the geography check, and writing whose count goes
//   from 0 to 25 on the last day.
// - Two rows that are not valid events: a name instead of a pilot code,
//   and a value with a field no event has. Both are left out.
// - TST-01 in other-org: the same code in another organisation, a different learner.
import type { ExportRow } from '../../api/_lib/export.ts';

const MINUTE = 60_000;

const uuid = (prefix: string, n: number): string => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const LESSON = {
  L01: 'finding-out-about-the-past',
  L02: 'objects-and-people',
  L03: 'changing-scale',
  L04: 'origin-accounts',
} as const;

interface SessionSpec {
  org?: string;
  code: string;
  device: number;
  session: number;
  start: string;
  /** Added to the device clock (a wrong clock). */
  clock?: number;
  /** How long after it happened the server got it. */
  delay?: number;
}

interface Extra {
  lesson?: string;
  stage?: string;
  value?: Record<string, unknown>;
}

let counter = 0;

function sessionOf(spec: SessionSpec) {
  const start = Date.parse(spec.start);
  return (minutes: number, type: string, extra: Extra = {}): ExportRow => {
    const happened = start + minutes * MINUTE;
    counter += 1;
    return {
      id: uuid('30000000', counter),
      org: spec.org ?? 'test-org',
      pilot_code: spec.code,
      device_id: uuid('20000000', spec.device),
      session_id: uuid('10000000', spec.session),
      type,
      lesson_id: extra.lesson ?? null,
      stage: extra.stage ?? null,
      value: extra.value ?? {},
      ts: new Date(happened + (spec.clock ?? 0)).toISOString(),
      received_at: new Date(happened + (spec.delay ?? 1500)).toISOString().replace('Z', '000Z'),
      app_version: '0.1.0',
    };
  };
}

export function fixtureRows(): ExportRow[] {
  counter = 0;
  const { L01, L02, L03, L04 } = LESSON;
  const rows: ExportRow[] = [];

  // TST-01, test-org
  const s1 = sessionOf({ code: 'TST-01', device: 1, session: 1, start: '2026-10-19T02:00:00Z' });
  rows.push(
    s1(0, 'session_start'),
    s1(0.1, 'lesson_open', { lesson: L01 }),
    s1(0.2, 'stage_enter', { lesson: L01, stage: 'read' }),
    s1(0.5, 'heartbeat', { lesson: L01, stage: 'read' }),
    s1(1, 'heartbeat', { lesson: L01, stage: 'read' }),
    s1(1.5, 'heartbeat', { lesson: L01, stage: 'read' }),
    s1(2, 'heartbeat', { lesson: L01, stage: 'read' }),
    s1(2.2, 'quick_check_answer', { lesson: L01, value: { q: 0, selected: 1, correct: false, attempt: 1 } }),
    s1(2.3, 'quick_check_answer', { lesson: L01, value: { q: 0, selected: 2, correct: true, attempt: 2 } }),
    s1(2.4, 'quick_check_answer', { lesson: L01, value: { q: 1, selected: 0, correct: true, attempt: 1 } }),
    s1(2.5, 'simpler_toggle', { lesson: L01, value: { level: 'simpler' } }),
    s1(2.6, 'listen_play', { lesson: L01 }),
    s1(2.7, 'simpler_toggle', { lesson: L01, value: { level: 'standard' } }),
    s1(3, 'writing_saved', { lesson: L01, stage: 'read', value: { words: 12 } }),
    s1(3.5, 'writing_saved', { lesson: L01, stage: 'read', value: { words: 15 } }),
    s1(4, 'stage_complete', { lesson: L01, stage: 'read' }),
    s1(4.1, 'stage_enter', { lesson: L01, stage: 'watch' }),
    s1(4.2, 'video_choice', { lesson: L01, value: { choice: 'video' } }),
    s1(4.3, 'video_play', { lesson: L01 }),
    s1(4.5, 'video_progress', { lesson: L01, value: { percent: 25 } }),
    s1(5, 'video_progress', { lesson: L01, value: { percent: 50 } }),
    s1(5.5, 'heartbeat', { lesson: L01, stage: 'watch' }),
    s1(6, 'stage_complete', { lesson: L01, stage: 'watch' }),
    s1(6.1, 'stage_enter', { lesson: L01, stage: 'reflect' }),
    s1(7, 'writing_saved', { lesson: L01, stage: 'reflect', value: { words: 20 } }),
    s1(7.5, 'stage_complete', { lesson: L01, stage: 'reflect' }),
    s1(7.6, 'lesson_complete', { lesson: L01 }),
    s1(8, 'heartbeat'),
    s1(8.5, 'heartbeat'),
    s1(9, 'session_end'),
  );
  const s2 = sessionOf({ code: 'TST-01', device: 1, session: 2, start: '2026-10-28T02:00:00Z' });
  const repeated = s2(1, 'heartbeat', { lesson: L02, stage: 'read' });
  rows.push(
    s2(0, 'session_start'),
    s2(0.1, 'lesson_open', { lesson: L02 }),
    s2(0.5, 'quick_check_answer', { lesson: L02, value: { q: 0, selected: 3, correct: true, attempt: 1 } }),
    s2(0.6, 'quick_check_answer', { lesson: L02, value: { q: 1, selected: 1, correct: true, attempt: 1 } }),
    repeated,
    s2(1.5, 'heartbeat', { lesson: L02, stage: 'read' }),
    s2(2, 'quiz_start', { value: { section: 'history' } }),
    s2(3, 'quiz_submit', { value: { section: 'history', score: 6, total: 10, attempt: 1 } }),
    s2(4, 'quiz_start', { value: { section: 'history' } }),
    s2(5, 'quiz_submit', { value: { section: 'history', score: 9, total: 10, attempt: 2 } }),
    { ...repeated },
  );

  // TST-02, test-org: offline for two days, then a tablet whose clock was reset.
  const s3 = sessionOf({ code: 'TST-02', device: 2, session: 3, start: '2026-10-21T03:00:00Z', delay: 2 * 24 * 60 * MINUTE });
  rows.push(
    s3(0, 'session_start'),
    s3(0.1, 'lesson_open', { lesson: L01 }),
    s3(0.5, 'quick_check_answer', { lesson: L01, value: { q: 0, selected: 0, correct: false, attempt: 1 } }),
    s3(0.6, 'quick_check_answer', { lesson: L01, value: { q: 1, selected: 2, correct: true, attempt: 1 } }),
    s3(1, 'heartbeat', { lesson: L01, stage: 'read' }),
    s3(1.2, 'stage_enter', { lesson: L01, stage: 'watch' }),
    s3(1.3, 'video_choice', { lesson: L01, value: { choice: 'read' } }),
    s3(1.4, 'video_fail', { lesson: L01, value: { reason: 'offline' } }),
    s3(1.5, 'writing_saved', { lesson: L01, stage: 'write', value: { words: 30 } }),
    s3(2, 'heartbeat', { lesson: L01, stage: 'write' }),
    s3(2.5, 'stage_complete', { lesson: L01, stage: 'read' }),
  );
  const reset = Date.parse('2026-01-02T03:00:00Z') - Date.parse('2026-10-24T03:00:00Z');
  const s4 = sessionOf({ code: 'TST-02', device: 2, session: 4, start: '2026-10-24T03:00:00Z', clock: reset });
  rows.push(
    s4(0, 'session_start'),
    s4(0.1, 'lesson_open', { lesson: L04 }),
    s4(0.5, 'quick_check_answer', { lesson: L04, value: { q: 0, selected: 1, correct: true, attempt: 1 } }),
    s4(0.6, 'quick_check_answer', { lesson: L04, value: { q: 1, selected: 1, correct: true, attempt: 1 } }),
    s4(1, 'heartbeat', { lesson: L04, stage: 'read' }),
    s4(1.5, 'listen_play', { lesson: L04 }),
    s4(2, 'session_end'),
  );

  // TST-03, test-org
  const s5 = sessionOf({ code: 'TST-03', device: 3, session: 5, start: '2026-10-30T02:00:00Z' });
  rows.push(
    s5(0, 'session_start'),
    s5(0.2, 'quiz_start', { value: { section: 'geography' } }),
    s5(1, 'quiz_submit', { value: { section: 'geography', score: 4, total: 10, attempt: 1 } }),
    s5(1.5, 'heartbeat'),
    s5(2, 'lesson_open', { lesson: L03 }),
    s5(2.1, 'stage_enter', { lesson: L03, stage: 'write' }),
    s5(2.5, 'writing_saved', { lesson: L03, stage: 'write', value: { words: 0 } }),
  );
  const s6 = sessionOf({ code: 'TST-03', device: 3, session: 6, start: '2026-11-01T02:00:00Z' });
  rows.push(
    s6(0, 'session_start'),
    s6(0.5, 'heartbeat', { lesson: L03, stage: 'write' }),
    s6(1, 'writing_saved', { lesson: L03, stage: 'write', value: { words: 25 } }),
    s6(1.1, 'stage_complete', { lesson: L03, stage: 'write' }),
  );

  // Not valid events: a name instead of a code, and a field no event has.
  const bad = sessionOf({ code: 'Budi', device: 3, session: 5, start: '2026-10-30T02:00:00Z' });
  rows.push(bad(3, 'session_start'));
  const extra = s5(3, 'writing_saved', { lesson: L03, stage: 'write', value: { words: 3, text: 'secret words' } });
  rows.push(extra);

  // TST-01 in another organisation.
  const s7 = sessionOf({ org: 'other-org', code: 'TST-01', device: 4, session: 7, start: '2026-10-22T02:00:00Z' });
  rows.push(
    s7(0, 'session_start'),
    s7(0.1, 'lesson_open', { lesson: L01 }),
    s7(0.5, 'heartbeat', { lesson: L01, stage: 'read' }),
    s7(1, 'quick_check_answer', { lesson: L01, value: { q: 0, selected: 2, correct: true, attempt: 1 } }),
    s7(1.5, 'video_choice', { lesson: L01, value: { choice: 'video' } }),
    s7(2, 'video_fail', { lesson: L01, value: { reason: 'timeout' } }),
  );

  // The export lists rows in the order the server received them.
  return rows.sort((a, b) => (a.received_at < b.received_at ? -1 : a.received_at > b.received_at ? 1 : a.id < b.id ? -1 : 1));
}
