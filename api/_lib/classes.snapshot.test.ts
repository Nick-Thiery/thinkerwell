// @vitest-environment node
// The monthly impact snapshot (GET program.snapshot, GET admin.snapshot) against the real SQL, on PGlite.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ImpactSnapshot, SyncLearner } from '../../src/classes/protocol.js';
import { Limiter, handleClasses, snapshotMonth } from './classes.js';
import { classesDb, type Runner } from './classesDb.js';

const ADMIN = 'admin-token-for-the-tests-0123456789abcdef';
const ENV = { DATABASE_URL: 'pglite://memory', CLASSES_ADMIN_TOKEN: ADMIN };
const SCHEMA = readFileSync(new URL('../../db/classes.sql', import.meta.url), 'utf8');
const BASE = 'https://thinkerwell.example/api/classes';

function pgliteRunner(pg: PGlite | Parameters<Parameters<PGlite['transaction']>[0]>[0]): Runner {
  return {
    async exec(text: string) {
      await pg.exec(text);
    },
    async query<T>(text: string, params: readonly unknown[] = []) {
      return (await pg.query(text, params as unknown[])).rows as T[];
    },
    async transaction<R>(work: (runner: Runner) => Promise<R>) {
      if ('transaction' in pg) return (await pg.transaction((tx) => work(pgliteRunner(tx)))) as R;
      return work(pgliteRunner(pg));
    },
  };
}

let pg: PGlite;
let clock: Date;
const limit = new Limiter();

beforeEach(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  clock = new Date('2026-11-30T04:00:00.000Z');
});

function call(method: 'GET' | 'POST', query: string, body?: unknown, key?: string) {
  const headers: Record<string, string> = { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200)}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (key) headers.authorization = `Bearer ${key}`;
  return handleClasses(new Request(`${BASE}${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), {
    env: ENV,
    db: () => classesDb(pgliteRunner(pg)),
    limit,
    now: () => clock,
  });
}

async function ok<T>(response: Promise<Response>): Promise<T> {
  const r = await response;
  expect(r.status).toBe(200);
  return (await r.json()) as T;
}

let n = 0;
function learner(code: string, days: string[], language: string | null, progress: SyncLearner['progress']): SyncLearner {
  n += 1;
  return {
    id: `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`,
    secret: String.fromCharCode(96 + n).repeat(43),
    classCode: code,
    nickname: `Learner name ${n}`,
    language,
    readingLevel: 'standard',
    progress,
    checks: [],
    days,
  };
}

const lesson = (lessonId: string, courseId: string, startedAt: string, completedAt: string | null) => ({
  lessonId,
  courseId,
  stagesDone: completedAt ? (['read', 'write', 'speak', 'reflect'] as const).slice() : (['read'] as const).slice(),
  currentStage: completedAt ? ('reflect' as const) : ('write' as const),
  startedAt,
  updatedAt: completedAt ?? startedAt,
  completedAt,
});

/** Two organisations; HELP with three learners, the other with one. */
async function setUp() {
  const help = await ok<{ id: string; orgKey: string }>(call('POST', '', { action: 'admin.createOrg', name: 'HELP for Refugees' }, ADMIN));
  const other = await ok<{ id: string; orgKey: string }>(call('POST', '', { action: 'admin.createOrg', name: 'Partner in Malaysia' }, ADMIN));
  const helpClass = await ok<{ code: string }>(call('POST', '', { action: 'program.createClass', name: 'Morning group' }, help.orgKey));
  const otherClass = await ok<{ code: string }>(call('POST', '', { action: 'program.createClass', name: 'Kelas pagi' }, other.orgKey));
  const learners = [
    // Worked on 2 November and again on 10 November (8 days later): came back the next week. Finished a lesson in November.
    learner(helpClass.code, ['2026-11-02', '2026-11-10'], 'id', [lesson('finding-out-about-the-past', 'our-world', '2026-11-02T02:00:00Z', '2026-11-03T02:00:00Z')]),
    // Only 5 November: didn't come back. Started a Digital World lesson, and finished one in October (not counted).
    learner(helpClass.code, ['2026-10-30', '2026-11-05'], null, [
      lesson('dw-what-is-ai', 'digital-world', '2026-11-05T02:00:00Z', null),
      lesson('towns-near-rivers', 'our-world', '2026-10-29T02:00:00Z', '2026-10-30T02:00:00Z'),
    ]),
    // First worked on 25 November: on 30 November, too recent to tell.
    learner(helpClass.code, ['2026-11-25'], 'id', [lesson('families-and-communities', 'our-world', '2026-11-25T02:00:00Z', '2026-11-25T03:00:00Z')]),
  ];
  // Back on 20 November, 17 days after the 3rd: not "the next week".
  const elsewhere = learner(otherClass.code, ['2026-11-03', '2026-11-20'], 'ms', [lesson('sat-ban-chiang', 'southeast-asia-through-time', '2026-11-03T02:00:00Z', '2026-11-20T02:00:00Z')]);
  await ok(call('POST', '', { action: 'sync', learners: [...learners, elsewhere], removals: [] }));
  return { help, other };
}

describe('the impact snapshot', () => {
  it("gives an organisation its own month in counts only: active learners, lessons finished, courses, languages, who came back", async () => {
    const { help } = await setUp();
    const snapshot = await ok<ImpactSnapshot>(call('GET', '?action=program.snapshot&month=2026-11', undefined, help.orgKey));
    expect(snapshot).toEqual({
      month: '2026-11',
      orgName: 'HELP for Refugees',
      generatedAt: '2026-11-30T04:00:00.000Z',
      activeLearners: 3,
      lessonsFinished: 2,
      courses: [
        { courseId: 'our-world', learners: 2, lessonsFinished: 2 },
        { courseId: 'digital-world', learners: 1, lessonsFinished: 0 },
      ],
      languages: [
        { language: 'id', learners: 2 },
        { language: 'en', learners: 1 },
      ],
      cameBack: { returned: 1, counted: 2, tooRecent: 1 },
    });
    // Nothing in it names or describes one learner.
    expect(JSON.stringify(snapshot)).not.toMatch(/Learner name|1111/);
  });

  it('counts a learner as too recent only until their next week is over', async () => {
    const { help } = await setUp();
    clock = new Date('2026-12-15T04:00:00.000Z');
    const snapshot = await ok<ImpactSnapshot>(call('GET', '?action=program.snapshot&month=2026-11', undefined, help.orgKey));
    expect(snapshot.cameBack).toEqual({ returned: 1, counted: 3, tooRecent: 0 });
  });

  it('gives the admin every organisation, or one', async () => {
    const { other } = await setUp();
    const all = await ok<ImpactSnapshot>(call('GET', '?action=admin.snapshot&month=2026-11', undefined, ADMIN));
    expect(all).toMatchObject({ orgName: null, activeLearners: 4, lessonsFinished: 3, cameBack: { returned: 1, counted: 3, tooRecent: 1 } });
    expect(all.languages).toEqual([
      { language: 'id', learners: 2 },
      { language: 'en', learners: 1 },
      { language: 'ms', learners: 1 },
    ]);
    const one = await ok<ImpactSnapshot>(call('GET', `?action=admin.snapshot&month=2026-11&org=${other.id}`, undefined, ADMIN));
    expect(one).toMatchObject({ orgName: 'Partner in Malaysia', activeLearners: 1, lessonsFinished: 1, courses: [{ courseId: 'southeast-asia-through-time', learners: 1, lessonsFinished: 1 }] });
    expect((await call('GET', '?action=admin.snapshot&month=2026-11&org=00000000-0000-4000-8000-000000000000', undefined, ADMIN)).status).toBe(404);
  });

  it("an organisation's key never gets the admin snapshot or another month's made-up dates", async () => {
    const { help } = await setUp();
    expect((await call('GET', '?action=admin.snapshot&month=2026-11', undefined, help.orgKey)).status).toBe(403);
    for (const month of ['2026-10', '2026-12', '2026-13', '26-11', '2026-11-01', '', "2026-11'"]) {
      expect((await call('GET', `?action=program.snapshot&month=${encodeURIComponent(month)}`, undefined, help.orgKey)).status).toBe(404);
    }
  });

  it('takes a month from November 2026 to the current one', () => {
    const now = new Date('2027-02-03T00:00:00Z');
    expect(snapshotMonth('2026-11', now)).toBe('2026-11');
    expect(snapshotMonth('2027-02', now)).toBe('2027-02');
    expect(snapshotMonth('2027-03', now)).toBeNull();
    expect(snapshotMonth('2026-10', now)).toBeNull();
    expect(snapshotMonth(null, now)).toBeNull();
  });
});
