// @vitest-environment node
// /api/classes through the real driver (postgres.js) against a real Postgres, so a plain `npm test` skips it:
//
//   TEST_DATABASE_URL="postgres://user:pass@localhost:5432/scratch" npx vitest run api/_lib/classes.integration.test.ts
//
// Use a scratch database: it makes the cv_ tables and leaves its rows there. (PGlite's socket server,
// @electric-sql/pglite-socket, is enough.) ./classes.test.ts covers the rest on PGlite without a driver.
import { describe, expect, it } from 'vitest';
import { Limiter, handleClasses } from './classes';
import { classesDb, ensureClassesSchema, postgresRunner } from './classesDb';
const URL_ = process.env.TEST_DATABASE_URL;
const ADMIN = 'x'.repeat(40);
const env = { DATABASE_URL: URL_ ?? '', CLASSES_ADMIN_TOKEN: ADMIN };
const limit = new Limiter();
let schema: Promise<void> | undefined;
const call = (method: string, q: string, body?: unknown, key?: string) =>
  handleClasses(
    new Request('https://t.example/api/classes' + q, {
      method,
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    { env, db: (u) => classesDb(postgresRunner(u)), prepare: (u) => (schema ??= ensureClassesSchema(postgresRunner(u))), limit, now: () => new Date() },
  );
describe.skipIf(!URL_)('/api/classes through postgres.js', () => {
  // A new learner each run, so the test can run again on the same database.
  const learnerId = crypto.randomUUID();
  it('makes its tables, saves a sync, and answers the teacher and the admin dashboard', async () => {
    const org = (await (await call('POST', '', { action: 'admin.createOrg', name: 'Org' }, ADMIN)).json()) as { orgKey: string };
    const cls = (await (await call('POST', '', { action: 'program.createClass', name: 'C' }, org.orgKey)).json()) as { code: string; teacherKey: string };
    const r = await call('POST', '', {
      action: 'sync',
      removals: [],
      learners: [
        {
          id: learnerId,
          secret: 'a'.repeat(43),
          classCode: cls.code,
          nickname: 'A',
          language: 'id',
          readingLevel: null,
          progress: [
            {
              lessonId: 'towns-near-rivers',
              courseId: 'our-world',
              stagesDone: ['read', 'write'],
              currentStage: 'speak',
              startedAt: new Date(Date.now() - 1e6).toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: null,
            },
          ],
          checks: [{ sectionId: 'history', attempts: 1, lastAt: null }],
          days: [new Date().toISOString().slice(0, 10)],
        },
      ],
    });
    expect(await r.json()).toEqual({ results: { [learnerId]: 'saved' } });
    const view = (await (await call('GET', '?action=class', undefined, cls.teacherKey)).json()) as { learners: Array<{ progress: Array<{ stagesDone: string[] }> }> };
    expect(view.learners[0]!.progress[0]!.stagesDone).toEqual(['read', 'write']);
    const stats = await call('GET', '?action=admin', undefined, ADMIN);
    expect(stats.status).toBe(200);
    const s = (await stats.json()) as { totals: { learners: number; active7: number }; weeks: unknown[] };
    expect(s.totals.learners).toBeGreaterThanOrEqual(1);
    expect(s.totals.active7).toBeGreaterThanOrEqual(1);
    expect(s.weeks).toHaveLength(12);

    // The monthly impact snapshot: a date and an organisation id that may be null, through the real driver.
    const month = new Date().toISOString().slice(0, 7);
    const all = await call('GET', `?action=admin.snapshot&month=${month}`, undefined, ADMIN);
    expect(all.status).toBe(200);
    expect(((await all.json()) as { activeLearners: number }).activeLearners).toBeGreaterThanOrEqual(1);
    const own = (await (await call('GET', `?action=program.snapshot&month=${month}`, undefined, org.orgKey)).json()) as {
      orgName: string;
      activeLearners: number;
      languages: Array<{ language: string; learners: number }>;
    };
    expect(own).toMatchObject({ orgName: 'Org', activeLearners: 1, languages: [{ language: 'id', learners: 1 }] });
  }, 30000);
});
