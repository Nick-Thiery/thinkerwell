// @vitest-environment node
// /api/classes against the real SQL (db/classes.sql), on PGlite: Postgres in memory.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AdminStats, ClassDetail, ProgramOverview, SyncLearner } from '../../src/classes/protocol.js';
import { BAD_KEYS_PER_CONNECTION, Limiter, handleClasses, hashKey } from './classes.js';
import { classesDb, ensureClassesSchema, type Runner } from './classesDb.js';
import { CLASSES_SCHEMA } from './classesSchema.js';

const ADMIN = 'admin-token-for-the-tests-0123456789abcdef';
const ENV = { DATABASE_URL: 'pglite://memory', CLASSES_ADMIN_TOKEN: ADMIN };
const SCHEMA = readFileSync(new URL('../../db/classes.sql', import.meta.url), 'utf8');
const NOW = new Date('2026-11-19T04:00:00.000Z');
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
let limit: Limiter;
let clock: Date;

beforeEach(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  limit = new Limiter();
  clock = NOW;
});

function call(method: 'GET' | 'POST', query: string, body?: unknown, key?: string, env: Record<string, string | undefined> = ENV, ip = '203.0.113.7') {
  const headers: Record<string, string> = { 'x-forwarded-for': ip };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (key) headers.authorization = `Bearer ${key}`;
  const request = new Request(`${BASE}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleClasses(request, {
    env,
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

async function setUp() {
  const org = await ok<{ id: string; orgKey: string }>(call('POST', '', { action: 'admin.createOrg', name: 'HELP for Refugees' }, ADMIN));
  const made = await ok<{ id: string; code: string; teacherKey: string }>(call('POST', '', { action: 'program.createClass', name: 'Morning group' }, org.orgKey));
  return { org, made };
}

const SECRET_A = 'a'.repeat(43);
function learner(code: string, over: Partial<SyncLearner> = {}): SyncLearner {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    secret: SECRET_A,
    classCode: code,
    nickname: 'Amira',
    language: 'id',
    readingLevel: 'simpler',
    progress: [
      {
        lessonId: 'finding-out-about-the-past',
        courseId: 'our-world',
        stagesDone: ['read', 'write', 'speak', 'reflect'],
        currentStage: 'reflect',
        startedAt: '2026-11-17T02:00:00.000Z',
        updatedAt: '2026-11-18T03:00:00.000Z',
        completedAt: '2026-11-18T03:00:00.000Z',
      },
      {
        lessonId: 'towns-near-rivers',
        courseId: 'our-world',
        stagesDone: ['read'],
        currentStage: 'write',
        startedAt: '2026-11-18T03:10:00.000Z',
        updatedAt: '2026-11-18T03:20:00.000Z',
        completedAt: null,
      },
    ],
    checks: [{ sectionId: 'history', attempts: 2, lastAt: '2026-11-18T03:30:00.000Z' }],
    days: ['2026-11-17', '2026-11-18'],
    ...over,
  };
}

describe('/api/classes', () => {
  it('makes its own tables from a copy of db/classes.sql that still matches it, safely twice', async () => {
    expect(CLASSES_SCHEMA).toBe(SCHEMA);
    const fresh = new PGlite();
    await ensureClassesSchema(pgliteRunner(fresh));
    await ensureClassesSchema(pgliteRunner(fresh));
    const tables = await fresh.query<{ tablename: string }>(`select tablename from pg_tables where tablename like 'cv_%' order by 1`);
    expect(tables.rows.map((r) => r.tablename)).toEqual(['cv_active_days', 'cv_checks', 'cv_classes', 'cv_learners', 'cv_orgs', 'cv_progress', 'cv_removed']);
  });

  it('answers 503 until the database and the admin key are both set', async () => {
    for (const env of [{}, { DATABASE_URL: 'x' }, { CLASSES_ADMIN_TOKEN: ADMIN }, { DATABASE_URL: 'x', CLASSES_ADMIN_TOKEN: 'short' }]) {
      expect((await call('GET', '?action=lookup&code=K7M-Q4P', undefined, undefined, env)).status).toBe(503);
    }
  });

  it('makes an organisation and a class, and a learner looks the class up by its code', async () => {
    const { made } = await setUp();
    expect(made.code).toMatch(/^[2-9A-HJKMNP-Z]{3}-[2-9A-HJKMNP-Z]{3}$/);
    expect(await ok(call('GET', `?action=lookup&code=${made.code}`))).toEqual({
      className: 'Morning group',
      orgName: 'HELP for Refugees',
    });
    expect((await call('GET', '?action=lookup&code=ZZZ-ZZZ')).status).toBe(404);
    // Keys are kept only as hashes.
    const keys = await pg.query<{ key_hash: string }>('select key_hash from cv_classes');
    expect(keys.rows[0]!.key_hash).toBe(hashKey(made.teacherKey));
  });

  it("saves a learner's progress, and their teacher sees it by name", async () => {
    const { made } = await setUp();
    const sync = await ok<{ results: Record<string, string> }>(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    expect(sync.results).toEqual({
      '11111111-1111-4111-8111-111111111111': 'saved',
    });
    const view = await ok<ClassDetail>(call('GET', '?action=class', undefined, made.teacherKey));
    expect(view.name).toBe('Morning group');
    expect(view.learners).toHaveLength(1);
    const amira = view.learners[0]!;
    expect(amira).toMatchObject({
      name: 'Amira',
      number: 1,
      language: 'id',
      readingLevel: 'simpler',
      lastActiveAt: '2026-11-18T03:20:00.000Z',
    });
    expect(amira.progress.find((p) => p.lessonId === 'finding-out-about-the-past')).toMatchObject({
      stagesDone: ['read', 'write', 'speak', 'reflect'],
      completedAt: '2026-11-18T03:00:00.000Z',
    });
    expect(amira.checks).toEqual([{ sectionId: 'history', attempts: 2 }]);
    // Nothing a learner wrote can be sent: an unknown field refuses the whole request.
    const sneaky = { ...learner(made.code), writing: 'my answer' };
    expect(
      (
        await call('POST', '', {
          action: 'sync',
          learners: [sneaky],
          removals: [],
        })
      ).status,
    ).toBe(400);
  });

  it('replaces what a device sent before, and never trusts a clock in the future', async () => {
    const { made } = await setUp();
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    const later = learner(made.code, {
      progress: [
        {
          lessonId: 'towns-near-rivers',
          courseId: 'our-world',
          stagesDone: ['read', 'write'],
          currentStage: 'speak',
          startedAt: null,
          updatedAt: '2030-01-01T00:00:00.000Z',
          completedAt: null,
        },
      ],
    });
    await ok(call('POST', '', { action: 'sync', learners: [later], removals: [] }));
    const view = await ok<ClassDetail>(call('GET', '?action=class', undefined, made.teacherKey));
    expect(view.learners[0]!.progress).toHaveLength(1);
    expect(view.learners[0]!.progress[0]!.updatedAt).toBe(NOW.toISOString());
  });

  it('refuses another device writing as the same learner, and a learner the teacher removed stops sharing', async () => {
    const { made } = await setUp();
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    const other = await ok<{ results: Record<string, string> }>(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code, { secret: 'b'.repeat(43), nickname: 'Not Amira' })],
        removals: [],
      }),
    );
    expect(Object.values(other.results)).toEqual(['forbidden']);
    const view = await ok<ClassDetail>(call('GET', '?action=class', undefined, made.teacherKey));
    expect(view.learners[0]!.name).toBe('Amira');
    await ok(call('POST', '', { action: 'class.removeLearner', learnerId: view.learners[0]!.id }, made.teacherKey));
    const again = await ok<{ results: Record<string, string> }>(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    expect(Object.values(again.results)).toEqual(['removed']);
    expect((await pg.query('select * from cv_progress')).rows).toEqual([]);
  });

  it('forgets everything about a learner who stops sharing', async () => {
    const { made } = await setUp();
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [],
        removals: [{ id: learner(made.code).id, secret: SECRET_A }],
      }),
    );
    for (const table of ['cv_learners', 'cv_progress', 'cv_checks', 'cv_active_days']) {
      expect((await pg.query(`select * from ${table}`)).rows).toEqual([]);
    }
  });

  it('lets an organisation see and run only its own classes', async () => {
    const { org, made } = await setUp();
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    const program = await ok<ProgramOverview>(call('GET', '?action=program', undefined, org.orgKey));
    expect(program.classes).toEqual([
      expect.objectContaining({
        name: 'Morning group',
        learners: 1,
        activeThisWeek: 1,
        lessonsFinished: 1,
      }),
    ]);
    const detail = await ok<ClassDetail>(call('GET', `?action=program.class&id=${made.id}`, undefined, org.orgKey));
    expect(detail.learners[0]!.name).toBe('Amira');

    const other = await ok<{ orgKey: string }>(call('POST', '', { action: 'admin.createOrg', name: 'Another group' }, ADMIN));
    expect((await call('GET', `?action=program.class&id=${made.id}`, undefined, other.orgKey)).status).toBe(404);
    expect((await call('POST', '', { action: 'program.archiveClass', classId: made.id, archived: true }, other.orgKey)).status).toBe(404);

    // A new teacher link replaces the old one.
    const fresh = await ok<{ teacherKey: string }>(call('POST', '', { action: 'program.newTeacherLink', classId: made.id }, org.orgKey));
    expect((await call('GET', '?action=class', undefined, made.teacherKey)).status).toBe(403);
    expect((await call('GET', '?action=class', undefined, fresh.teacherKey)).status).toBe(200);

    // A closed class takes no one new, and those in it stop sharing.
    await ok(call('POST', '', { action: 'program.archiveClass', classId: made.id, archived: true }, org.orgKey));
    expect((await call('GET', `?action=lookup&code=${made.code}`)).status).toBe(404);
    const closed = await ok<{ results: Record<string, string> }>(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    expect(Object.values(closed.results)).toEqual(['removed']);
  });

  it('never gives the admin dashboard a name', async () => {
    const { org, made } = await setUp();
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    const detail = await call('GET', `?action=admin.class&id=${made.id}`, undefined, ADMIN);
    const text = await detail.text();
    expect(text).not.toContain('Amira');
    expect(text).not.toContain('11111111-1111');
    const parsed = JSON.parse(text) as ClassDetail;
    expect(parsed.learners[0]).toMatchObject({
      id: 'learner-1',
      name: null,
      number: 1,
    });
    expect((await call('GET', `?action=admin.org&id=${org.id}`, undefined, ADMIN)).status).toBe(200);
    // A teacher's or organisation's key opens nothing on the admin side, and the reverse.
    expect((await call('GET', '?action=admin', undefined, org.orgKey)).status).toBe(403);
    expect((await call('GET', '?action=program', undefined, ADMIN)).status).toBe(403);
  });

  it('counts the numbers for the admin dashboard', async () => {
    const { made } = await setUp();
    await ok(
      call('POST', '', {
        action: 'sync',
        learners: [learner(made.code)],
        removals: [],
      }),
    );
    const second = learner(made.code, {
      id: '22222222-2222-4222-8222-222222222222',
      secret: 'c'.repeat(43),
      nickname: 'Budi',
      language: 'vi',
      readingLevel: 'standard',
      checks: [],
      days: ['2026-11-19'],
    });
    await ok(call('POST', '', { action: 'sync', learners: [second], removals: [] }));
    const stats = await ok<AdminStats>(call('GET', '?action=admin', undefined, ADMIN));
    expect(stats.totals).toMatchObject({
      orgs: 1,
      classes: 1,
      learners: 2,
      active7: 2,
      active30: 2,
      lessonsStarted: 4,
      lessonsFinished: 2,
      stagesDone: 10,
      checksTried: 2,
    });
    expect(stats.weeks).toHaveLength(12);
    expect(stats.weeks.at(-1)).toMatchObject({
      week: '2026-11-16',
      newLearners: 2,
      activeLearners: 2,
      lessonsFinished: 2,
    });
    expect(stats.courses).toEqual([
      {
        courseId: 'our-world',
        learners: 2,
        lessonsStarted: 4,
        lessonsFinished: 2,
      },
    ]);
    expect(stats.languages).toEqual(
      expect.arrayContaining([
        { language: 'id', learners: 1 },
        { language: 'vi', learners: 1 },
      ]),
    );
    expect(stats.stages.map((s) => [s.stage, s.lessons])).toEqual([
      ['read', 4],
      ['write', 2],
      ['speak', 2],
      ['watch', 0],
      ['reflect', 2],
    ]);
    expect(stats.finishedBands.find((b) => b.band === '1–2')?.learners).toBe(2);
    expect(stats.orgs[0]).toMatchObject({
      name: 'HELP for Refugees',
      learners: 2,
      activeThisWeek: 2,
      lessonsFinished: 2,
    });
    expect(JSON.stringify(stats)).not.toMatch(/Amira|Budi/);
  });

  it('slows down a connection that keeps trying wrong keys or codes', async () => {
    await setUp();
    for (let i = 0; i < BAD_KEYS_PER_CONNECTION; i++) await call('GET', '?action=class', undefined, 'x'.repeat(43));
    expect((await call('GET', '?action=class', undefined, 'x'.repeat(43))).status).toBe(429);
    expect((await call('GET', '?action=lookup&code=AAA-AAA')).status).toBe(429);
    expect((await call('GET', '?action=lookup&code=AAA-AAA', undefined, undefined, ENV, '198.51.100.9')).status).toBe(404);
  });

  it('refuses a post from another site', async () => {
    const request = new Request(BASE, {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'sync', learners: [], removals: [] }),
    });
    const response = await handleClasses(request, {
      env: ENV,
      db: () => classesDb(pgliteRunner(pg)),
      limit,
      now: () => clock,
    });
    expect(response.status).toBe(403);
  });
});
