// @vitest-environment node
// The pilot report (npm run pilot:report; docs/notes/pilot-measurement.md, "Reading the results"),
// on the made-up export in ./fixtures.ts.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CSV_HEADER, csvLine } from '../../api/_lib/export.ts';
import { EVENT_SPECS } from '../../src/measurement/events.ts';
import { LESSON, fixtureRows } from './fixtures.ts';
import {
  buildReport,
  CLOCK_AHEAD_MS,
  csvTables,
  dateIn,
  formatReport,
  type GroupReport,
  MAX_QUEUE_DELAY_MS,
  median,
  parseCsv,
  prepare,
  readLessons,
  REPORT_EVENTS,
  rowsFromCsv,
  rowsFromJson,
  type Report,
  type ReportOptions,
} from './lib.ts';
import { parseArgs, run } from './report.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SAMPLE = path.join(import.meta.dirname, 'fixtures', 'sample-export.csv');
const lessons = readLessons(ROOT);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

const exportCsv = (rows = fixtureRows()): string => `${CSV_HEADER.join(',')}\n${rows.map(csvLine).join('')}`;
const exportJson = (rows = fixtureRows()): string => `[${rows.map((row) => `\n${JSON.stringify(row)}`).join(',')}\n]\n`;

function report(options: Partial<ReportOptions> = {}, text = exportCsv()): Report {
  return buildReport(prepare(rowsFromCsv(text)), { timeZone: 'UTC', lessons, ...options });
}

function group(r: Report, org: string): GroupReport {
  const found = r.groups.find((g) => g.org === org);
  if (!found) throw new Error(`no group ${org}`);
  return found;
}

describe('the event list', () => {
  it('matches EVENT_SPECS exactly: every type, whether it needs a lesson or stage, and its fields', () => {
    expect(Object.keys(REPORT_EVENTS).sort()).toEqual(Object.keys(EVENT_SPECS).sort());
    for (const [type, spec] of Object.entries(EVENT_SPECS)) {
      const mine = REPORT_EVENTS[type as keyof typeof REPORT_EVENTS];
      expect(mine.lesson, type).toBe(spec.lesson === 'required');
      expect(mine.stage, type).toBe(spec.stage === 'required');
      expect([...mine.value].sort(), type).toEqual(Object.keys(spec.value).sort());
      expect('stages' in mine ? mine.stages : undefined, type).toEqual('stages' in spec ? spec.stages : undefined);
    }
  });
});

describe('reading an export', () => {
  it('parses CSV with quotes, doubled quotes and line breaks', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi""\nthere"\r\n1,\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
      ['1', ''],
    ]);
  });

  it('reads the CSV and the JSON export the same way', () => {
    const fromCsv = prepare(rowsFromCsv(exportCsv()));
    const fromJson = prepare(rowsFromJson(exportJson()));
    expect(fromCsv.events.length).toBeGreaterThan(50);
    expect(fromCsv).toEqual(fromJson);
  });

  it('uses the v_ columns when the value column is missing', () => {
    const rows = fixtureRows().filter((row) => row.type === 'quiz_submit');
    const full = rowsFromCsv(exportCsv(rows));
    const header = CSV_HEADER.slice(0, -1).join(',');
    const lines = rows.map((row) => csvLine(row).replace(/,"\{.*\}"\n$/, '\n').replace(/,\{\}\n$/, '\n'));
    const withoutValue = rowsFromCsv(`${header}\n${lines.join('')}`);
    expect(prepare(withoutValue).events).toEqual(prepare(full).events);
  });

  it('keeps a repeated event once, and leaves out rows that are not valid events', () => {
    const prepared = prepare(rowsFromCsv(exportCsv()));
    expect(prepared.duplicates).toBe(1);
    expect(prepared.skipped).toBe(2); // a name for a code, and a field no event has
    expect(prepared.events.some((event) => event.pilotCode === 'Budi')).toBe(false);
    for (const bad of [
      { type: 'nonsense' },
      { lesson_id: 'Not A Slug' },
      { stage: 'dance' },
      { ts: 'yesterday' },
      { value: { words: -1 } },
      { value: { words: 'many' } },
      { value: null },
    ]) {
      const row = { ...fixtureRows().find((r) => r.type === 'writing_saved')!, ...bad };
      expect(prepare(rowsFromJson(JSON.stringify([row]))).skipped, JSON.stringify(bad)).toBe(1);
    }
  });

  it('trusts a device clock that is right, even when it sent days later, and moves a session whose clock was reset', () => {
    const prepared = prepare(rowsFromCsv(exportCsv()));
    expect(prepared.sessionsMoved).toBe(1);
    const tst02 = prepared.events.filter((event) => event.pilotCode === 'TST-02');
    const offline = tst02.filter((event) => event.lessonId === LESSON.L01);
    const reset = tst02.filter((event) => event.lessonId === LESSON.L04);
    expect(dateIn(offline[0]!.time, 'UTC')).toBe('2026-10-21'); // when it happened, not 10-23 when it arrived
    expect(dateIn(reset[0]!.time, 'UTC')).toBe('2026-10-24'); // not January
    // Within a session, the device's order stands.
    const quick = reset.filter((event) => event.type === 'quick_check_answer');
    expect(quick.map((event) => event.value.q)).toEqual([0, 1]);
    expect(CLOCK_AHEAD_MS).toBeLessThan(MAX_QUEUE_DELAY_MS);
  });

  it('places days in the chosen time zone', () => {
    expect(dateIn(Date.parse('2026-10-19T20:00:00Z'), 'UTC')).toBe('2026-10-19');
    expect(dateIn(Date.parse('2026-10-19T20:00:00Z'), 'Asia/Jakarta')).toBe('2026-10-20');
  });

  it('names lessons by their file', () => {
    expect(lessons.get(LESSON.L04)?.label).toBe('L04');
  });
});

describe('the numbers', () => {
  const r = report();
  const org = group(r, 'test-org');
  const learner = (code: string) => org.perLearner.find((row) => row.pilotCode === code)!;
  const lesson = (id: string) => org.perLesson.find((row) => row.lessonId === id)!;

  it('reports each organisation, and all of them together', () => {
    expect(r.groups.map((g) => g.org)).toEqual(['other-org', 'test-org', 'all']);
    expect(group(r, 'other-org').learners).toBe(1);
    expect(group(r, 'all').learners).toBe(4); // TST-01 in two organisations is two learners
    expect(r.range).toEqual({ from: '2026-10-19', to: '2026-11-01', lastWeekFrom: '2026-10-26', timeZone: 'UTC' });
  });

  it('counts learners, sessions and active days', () => {
    expect(org.learners).toBe(3);
    expect(org.sessions.total).toBe(6);
    expect(learner('TST-01')).toMatchObject({ sessions: 2, activeDays: 2, firstDay: '2026-10-19', lastDay: '2026-10-28' });
    expect(learner('TST-02')).toMatchObject({ sessions: 2, activeDays: 2, firstDay: '2026-10-21', lastDay: '2026-10-24' });
    expect(org.activeDays.median).toBe(2);
  });

  it('counts active minutes from heartbeats, half a minute each, a repeat once', () => {
    expect(learner('TST-01').activeMinutes).toBe(4.5); // 9 heartbeats, one of them sent twice
    expect(learner('TST-01').lessonMinutes).toBe(3.5);
    expect(learner('TST-02').activeMinutes).toBe(1.5);
    expect(learner('TST-03').activeMinutes).toBe(1);
    expect(org.activeMinutes).toMatchObject({ total: 7, median: 1.5, min: 1, max: 4.5 });
  });

  it('counts lessons opened and completed, and steps by stage', () => {
    expect(learner('TST-01')).toMatchObject({ lessonsOpened: 2, lessonsCompleted: 1 });
    expect(org.lessonsCompleted.total).toBe(1);
    expect(org.learnersCompletedAny).toBe(1);
    expect(org.stepsCompleted).toEqual({ read: 2, write: 1, speak: 0, watch: 1, reflect: 1 });
  });

  it('works out first-try quick-check accuracy, early lessons against late ones in each learner\'s own order', () => {
    expect(org.quickChecks.firstTry).toEqual({ correct: 6, asked: 8, percent: 75 });
    // TST-01: L01 (1 of 2) then L02 (2 of 2); TST-02: L01 (1 of 2) then L04 (2 of 2), although L04's clock said January.
    expect(org.quickChecks.early).toEqual({ correct: 2, asked: 4, percent: 50 });
    expect(org.quickChecks.late).toEqual({ correct: 4, asked: 4, percent: 100 });
    expect(org.quickChecks.learnersInTrend).toBe(2);
    expect(org.quickChecks.byPosition).toEqual([
      { correct: 2, asked: 4, percent: 50 },
      { correct: 4, asked: 4, percent: 100 },
    ]);
    expect(lesson(LESSON.L01).quickCheckFirstTry).toEqual({ correct: 2, asked: 4, percent: 50 });
    expect(learner('TST-03').quickCheckFirstTry).toEqual({ correct: 0, asked: 0, percent: null });
  });

  it('leaves the middle lesson out of early and late when a learner did an odd number', () => {
    const rows = fixtureRows().filter((row) => row.pilot_code === 'TST-01' && row.org === 'test-org');
    const third = rows.filter((row) => row.type === 'quick_check_answer' && row.lesson_id === LESSON.L02).map((row, i) => ({
      ...row,
      id: `40000000-0000-4000-8000-00000000000${i}`,
      lesson_id: LESSON.L03,
      ts: row.ts.replace('2026-10-28', '2026-10-29'),
      received_at: row.received_at.replace('2026-10-28', '2026-10-29'),
      value: { ...row.value, correct: false },
    }));
    const three = group(report({}, exportCsv([...rows, ...third])), 'test-org');
    // L01 (1 of 2), L02 (2 of 2, the middle), L03 (0 of 2)
    expect(three.quickChecks.early).toEqual({ correct: 1, asked: 2, percent: 50 });
    expect(three.quickChecks.late).toEqual({ correct: 0, asked: 2, percent: 0 });
    expect(three.quickChecks.byPosition.map((a) => a.asked)).toEqual([2, 2, 2]);
  });

  it('gives each learner\'s first and best section check', () => {
    expect(org.perSectionCheck).toEqual([
      { org: 'test-org', pilotCode: 'TST-03', section: 'geography', submits: 1, firstPercent: 40, bestPercent: 40, firstScore: '4/10', bestScore: '4/10' },
      { org: 'test-org', pilotCode: 'TST-01', section: 'history', submits: 2, firstPercent: 60, bestPercent: 90, firstScore: '6/10', bestScore: '9/10' },
    ]);
    const history = org.sectionChecks.find((s) => s.section === 'history')!;
    expect(history).toMatchObject({ learnersStarted: 1, learnersSubmitted: 1 });
    expect(history.first.median).toBe(60);
    expect(history.best.median).toBe(90);
  });

  it('counts the simpler reading and Listen per lesson', () => {
    expect(lesson(LESSON.L01)).toMatchObject({ simplerSwitches: 1, simplerLearners: 1, standardSwitches: 1, listenPlays: 1, listenLearners: 1 });
    expect(lesson(LESSON.L04)).toMatchObject({ simplerSwitches: 0, listenPlays: 1, listenLearners: 1 });
  });

  it('counts video choices, plays, progress and failures per lesson', () => {
    expect(lesson(LESSON.L01)).toMatchObject({
      choseVideo: 1,
      choseRead: 1,
      videoPlays: 1,
      reached: { '25': 1, '50': 1, '75': 0, '100': 0 },
      failures: { timeout: 0, offline: 1, unavailable: 0 },
    });
    expect(group(r, 'other-org').perLesson[0]!.failures.timeout).toBe(1);
  });

  it('takes the latest word count of each piece of writing, by stage', () => {
    expect(org.writing.read).toMatchObject({ pieces: 1, words: { total: 15 } });
    expect(org.writing.write).toMatchObject({ pieces: 2, words: { total: 55, median: 27.5 } });
    expect(org.writing.watch.pieces).toBe(0);
    expect(org.writing.reflect.words.total).toBe(20);
    expect(learner('TST-01').words).toBe(35);
    expect(learner('TST-03').words).toBe(25);
  });

  it('works out retention: learners active in the last 7 days of the range', () => {
    expect(org.retention).toEqual({ learners: 3, activeLastWeek: 2, percent: (100 * 2) / 3 });
    expect(learner('TST-02').activeLastWeek).toBe(false);
  });

  it('keeps to the range given', () => {
    const late = report({ from: '2026-10-26' });
    const lateOrg = group(late, 'test-org');
    expect(late.groups.map((g) => g.org)).toEqual(['test-org']);
    expect(lateOrg.perLearner.map((row) => row.pilotCode)).toEqual(['TST-01', 'TST-03']);
    expect(late.input.outsideRange).toBeGreaterThan(0);
    expect(late.range).toMatchObject({ from: '2026-10-26', to: '2026-11-01', lastWeekFrom: '2026-10-26' });
    const short = report({ from: '2026-10-19', to: '2026-10-21' });
    expect(short.range.lastWeekFrom).toBe('2026-10-19'); // never before the range starts
  });

  it('works out medians', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('what it prints', () => {
  const r = report();

  it('prints only codes and numbers: no names, writing or device ids', () => {
    const text = formatReport(r);
    const json = JSON.stringify(r);
    const tables = Object.values(csvTables(r)).join('\n');
    for (const out of [text, json, tables]) {
      expect(out).not.toContain('Budi');
      expect(out).not.toContain('secret');
      expect(out).not.toMatch(UUID);
    }
    expect(text).toContain('Organisation test-org');
    expect(text).toContain('Quick checks, right on the first try: 6 of 8 (75%)');
    expect(text).toContain('early lessons 2 of 4 (50%), late lessons 4 of 4 (100%)');
    expect(text).toContain('Retention: 2 of 3 learners (67%) active in the last week');
  });

  it('writes the tables for a spreadsheet', () => {
    const tables = csvTables(r);
    expect(Object.keys(tables)).toEqual(['pilot-learners.csv', 'pilot-lessons.csv', 'pilot-section-checks.csv']);
    const learners = parseCsv(tables['pilot-learners.csv']!);
    expect(learners[0]!.slice(0, 3)).toEqual(['org', 'pilot_code', 'sessions']);
    expect(learners).toHaveLength(5); // the header and four learners ("all" is not repeated)
    const lessonsTable = parseCsv(tables['pilot-lessons.csv']!);
    expect(lessonsTable[1]!.slice(0, 3)).toEqual(['other-org', 'L01', LESSON.L01]);
  });

  it('says so when there is nothing to report', () => {
    for (const empty of ['', `${CSV_HEADER.join(',')}\n`]) {
      const nothing = report({}, empty);
      expect(nothing.groups).toEqual([]);
      expect(formatReport(nothing)).toContain('No events to report.');
    }
    const none = buildReport(prepare(rowsFromJson('[]')), { timeZone: 'UTC', lessons });
    expect(none.input).toMatchObject({ rows: 0, used: 0 });
    expect(Object.values(csvTables(none)).every((table) => table.split('\n').filter(Boolean).length === 1)).toBe(true);
    const outside = report({ from: '2027-01-01' });
    expect(outside.groups).toEqual([]);
  });

  it('keeps the sample export in step with the fixtures', () => {
    const wanted = exportCsv();
    if (process.env.UPDATE_FIXTURES) writeFileSync(SAMPLE, wanted);
    expect(readFileSync(SAMPLE, 'utf8'), 'Run UPDATE_FIXTURES=1 npx vitest run tools/measurement to update it').toBe(wanted);
  });
});

describe('npm run pilot:report', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'pilot-report-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads its options', () => {
    expect(parseArgs(['a.csv', '--from', '2026-10-01', '--to', '2026-10-31', '--json', '--csv-out', 'out', '--time-zone', 'Asia/Jakarta'])).toEqual({
      files: ['a.csv'],
      from: '2026-10-01',
      to: '2026-10-31',
      json: true,
      csvOut: 'out',
      timeZone: 'Asia/Jakarta',
    });
    expect(() => parseArgs([])).toThrow('export file');
    expect(() => parseArgs(['a.csv', '--from', '1 Oct'])).toThrow('--from');
    expect(() => parseArgs(['a.csv', '--from', '2026-11-01', '--to', '2026-10-01'])).toThrow('after');
    expect(() => parseArgs(['a.csv', '--time-zone', 'Mars/Base'])).toThrow('time zone');
    expect(() => parseArgs(['a.csv', '--verbose'])).toThrow('Unknown option');
  });

  it('runs on a CSV and a JSON file together, writing the tables', () => {
    const csvFile = path.join(dir, 'test.csv');
    const jsonFile = path.join(dir, 'other.json');
    const rows = fixtureRows();
    writeFileSync(csvFile, exportCsv(rows.filter((row) => row.org === 'test-org')));
    writeFileSync(jsonFile, exportJson(rows.filter((row) => row.org === 'other-org')));
    const out = path.join(dir, 'tables');
    const { report: both, written } = run({ files: [csvFile, jsonFile], timeZone: 'UTC', json: false, csvOut: out }, ROOT);
    expect(both.groups.map((g) => g.org)).toEqual(['other-org', 'test-org', 'all']);
    expect(written).toHaveLength(3);
    expect(existsSync(path.join(out, 'pilot-lessons.csv'))).toBe(true);
  });

  it('works from the command line', () => {
    const script = path.join(ROOT, 'tools', 'measurement', 'report.ts');
    const node = (args: string[]) => spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', script, ...args], { encoding: 'utf8', cwd: ROOT });
    const text = node([SAMPLE]);
    expect(text.status, text.stderr).toBe(0);
    expect(text.stdout).toContain('Thinkerwell pilot report');
    const json = node([SAMPLE, '--json']);
    expect((JSON.parse(json.stdout) as Report).groups).toHaveLength(3);
    const empty = path.join(dir, 'empty.csv');
    writeFileSync(empty, '');
    expect(node([empty]).stdout).toContain('No events to report.');
    expect(node([]).status).toBe(2);
    expect(node([path.join(dir, 'missing.csv')]).status).toBe(1);
  });
});
