// @vitest-environment node
// Runs only against a real Postgres that already has db/schema.sql applied, so a plain `npm test` skips it:
//
//   TEST_DATABASE_URL="postgres://user:pass@localhost:5432/scratch" npx vitest run api/_lib/db.integration.test.ts
//
// Use a scratch database: it deletes the rows of the test organisations when it finishes (never the others).
// docs/notes/pilot-measurement.md ("Switch on checklist") asks for one run before the pilot.
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkEvent, type MeasurementEvent } from '../../src/measurement/events.js';
import { eventsDb, exportDb } from './db.js';

const URL_ = process.env.TEST_DATABASE_URL;
const ORG_A = 'test-org-a';
const ORG_B = 'test-org-b';

function ev(n: number, over: Record<string, unknown> = {}): MeasurementEvent {
  const checked = checkEvent({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    org: ORG_A,
    pilotCode: 'TST-01',
    deviceId: '0a4d8f52-1c3b-4e7a-8b6d-9f2e5c7a1b30',
    sessionId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    type: 'quick_check_answer',
    lessonId: 'towns-near-rivers',
    value: { q: 1, selected: 2, correct: false, attempt: 1 },
    ts: 1_790_000_000_000 + n,
    appVersion: 'test',
    ...over,
  });
  if (!checked.ok) throw new Error(checked.error);
  return checked.value;
}

describe.skipIf(!URL_)('the database layer, against a real Postgres', () => {
  const sql = postgres(URL_ ?? 'postgres://unused', { max: 1, prepare: false });
  const clean = () => sql`delete from events where org in (${ORG_A}, ${ORG_B})`;

  beforeAll(clean);
  afterAll(async () => {
    await clean();
    await sql.end();
  });

  it('stores events once, however often they are sent', async () => {
    const db = eventsDb(URL_!);
    expect(await db.insert([ev(1), ev(2), ev(3, { org: ORG_B })])).toBe(3);
    expect(await db.insert([ev(1), ev(2)])).toBe(0);
    const rows = await sql<Array<{ n: number }>>`select count(*)::int as n from events where org in (${ORG_A}, ${ORG_B})`;
    expect(rows[0]!.n).toBe(3);
  });

  it('keeps the value as JSON and the details in their columns', async () => {
    const [row] = await sql<Array<{ value: Record<string, unknown>; lesson_id: string; stage: string | null; pilot_code: string }>>`
      select value, lesson_id, stage, pilot_code from events where id = '00000000-0000-4000-8000-000000000001'`;
    expect(row).toEqual({ value: { q: 1, selected: 2, correct: false, attempt: 1 }, lesson_id: 'towns-near-rivers', stage: null, pilot_code: 'TST-01' });
  });

  it('counts what a pilot code sent lately, for the rate limit', async () => {
    const counts = await eventsDb(URL_!).recentCounts(['TST-01', 'TST-99'], 60);
    expect(counts.get('TST-01')).toBe(3);
    expect(counts.get('TST-99')).toBeUndefined();
  });

  describe('refuses in the database what the checker would have refused (a second wall)', () => {
    const insert = (org: string, pilot: string, type: string, value: object = {}) =>
      sql`insert into events (id, org, pilot_code, device_id, session_id, type, value, ts, app_version)
          values (gen_random_uuid(), ${org}, ${pilot}, gen_random_uuid(), gen_random_uuid(), ${type}, ${sql.json(value as never)}, now(), 'test')`;

    it('takes a good row', async () => {
      await expect(insert(ORG_A, 'TST-01', 'heartbeat')).resolves.toBeDefined();
      await sql`delete from events where org = ${ORG_A} and type = 'heartbeat'`;
    });
    it('refuses an organisation code in the wrong shape', async () => {
      await expect(insert('Test Org', 'TST-01', 'heartbeat')).rejects.toThrow(/events_org_check/);
    });
    it('refuses a name for a pilot code', async () => {
      await expect(insert(ORG_A, 'Amina Rahimi', 'heartbeat')).rejects.toThrow(/events_pilot_code_check/);
    });
    it('refuses an event type that does not exist', async () => {
      await expect(insert(ORG_A, 'TST-01', 'screenshot')).rejects.toThrow(/events_type_check/);
    });
    it('refuses a value too big to be small numbers', async () => {
      await expect(insert(ORG_A, 'TST-01', 'heartbeat', { text: 'x'.repeat(600) })).rejects.toThrow(/events_value_check/);
    });
  });

  it('exports one organisation, in order, a page at a time, with the filters', async () => {
    const db = exportDb(URL_!);
    const all = await db.page({ org: ORG_A }, null, 100);
    expect(all.map((row) => row.id.slice(-1))).toEqual(['1', '2']);
    expect(all.every((row) => row.org === ORG_A)).toBe(true);
    expect(all[0]).toMatchObject({ pilot_code: 'TST-01', type: 'quick_check_answer', value: { attempt: 1 } });
    expect(all[0]!.ts).toMatch(/^2026-.*Z$/);

    const first = await db.page({ org: ORG_A }, null, 1);
    const last = first[0]!;
    const next = await db.page({ org: ORG_A }, `${last.received_at}|${last.id}`, 1);
    expect(next.map((row) => row.id)).not.toContain(last.id);

    expect(await db.page({ org: ORG_A, type: 'heartbeat' }, null, 10)).toEqual([]);
    expect(await db.page({ org: ORG_A, pilotCode: 'TST-02' }, null, 10)).toEqual([]);
    expect(await db.page({ org: ORG_A, from: '2999-01-01' }, null, 10)).toEqual([]);
    expect((await db.page({ org: ORG_A, to: '2999-01-01' }, null, 10)).length).toBe(2);
    expect((await db.page({ org: ORG_B }, null, 10)).length).toBe(1);
  });
});
