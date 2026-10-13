// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { MeasurementEvent } from '../../src/measurement/events.js';
import { handleEvents, MAX_EVENTS_PER_MINUTE, type EventsDb } from './events.js';

const URL_ = 'https://thinkerwell.example/api/events';
const ENV = { DATABASE_URL: 'postgres://user:secret@db.example/thinkerwell', MEASUREMENT_ORGS: 'help-jakarta, my-partner' };

function ev(n: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    org: 'help-jakarta',
    pilotCode: 'HLP-01',
    deviceId: '0a4d8f52-1c3b-4e7a-8b6d-9f2e5c7a1b30',
    sessionId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    type: 'lesson_open',
    lessonId: 'towns-near-rivers',
    value: {},
    ts: 1_790_000_000_000,
    appVersion: '0.1.0',
    ...over,
  };
}

function post(body: unknown, init: RequestInit & { headers?: Record<string, string> } = {}): Request {
  return new Request(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...init.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function fakeDb(recent: Record<string, number> = {}) {
  const stored: MeasurementEvent[] = [];
  const db: EventsDb = {
    recentCounts: vi.fn((codes: readonly string[]) => Promise.resolve(new Map(codes.map((code) => [code, recent[code] ?? 0])))),
    insert: vi.fn((events: readonly MeasurementEvent[]) => {
      stored.push(...events);
      return Promise.resolve(events.length);
    }),
  };
  return { db, stored, factory: vi.fn(() => db) };
}

const run = (request: Request, env: Record<string, string | undefined> = ENV, recent?: Record<string, number>) => {
  const fake = fakeDb(recent);
  return handleEvents(request, { env, db: fake.factory }).then((response) => ({ response, ...fake }));
};

describe('POST /api/events', () => {
  it('stores a valid batch and says 202', async () => {
    const { response, stored } = await run(post({ v: 1, events: [ev(1), ev(2, { type: 'stage_enter', stage: 'read' })] }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: 2, stored: 2 });
    expect(stored.map((event) => event.type)).toEqual(['lesson_open', 'stage_enter']);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('answers 503 when there is no database or no organisation list, and never touches a database', async () => {
    for (const env of [{}, { DATABASE_URL: ENV.DATABASE_URL }, { MEASUREMENT_ORGS: 'help-jakarta' }, { DATABASE_URL: '', MEASUREMENT_ORGS: 'x' }]) {
      const { response, factory } = await run(post({ v: 1, events: [ev(1)] }), env);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'not_configured' });
      expect(factory).not.toHaveBeenCalled();
    }
  });

  it('answers 405 to anything but POST', async () => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const { response } = await run(new Request(URL_, { method }));
      expect(response.status, method).toBe(405);
      expect(response.headers.get('allow')).toBe('POST');
    }
  });

  it('answers 415 to a body that is not JSON', async () => {
    const { response } = await run(post('x', { headers: { 'content-type': 'text/plain' } }));
    expect(response.status).toBe(415);
  });

  it('answers 403 to a page on another site', async () => {
    const { response, stored } = await run(post({ v: 1, events: [ev(1)] }, { headers: { origin: 'https://evil.example' } }));
    expect(response.status).toBe(403);
    expect(stored).toHaveLength(0);
    const same = await run(post({ v: 1, events: [ev(1)] }, { headers: { origin: 'https://thinkerwell.example' } }));
    expect(same.response.status).toBe(202);
  });

  it('answers 413 to a body over 32 kB, by its length or by its size', async () => {
    const big = 'x'.repeat(33 * 1024);
    const declared = await run(post(big, { headers: { 'content-length': String(big.length) } }));
    expect(declared.response.status).toBe(413);
    const streamed = await run(post(big));
    expect(streamed.response.status).toBe(413);
  });

  it('answers 400 to broken JSON, and says where for a bad batch without echoing it', async () => {
    expect((await run(post('{not json'))).response.status).toBe(400);
    const { response } = await run(post({ v: 1, events: [ev(1, { pilotCode: 'Amina Rahimi' })] }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; at: string };
    expect(body).toEqual({ error: 'invalid', at: 'events[0].pilotCode' });
    expect(JSON.stringify(body)).not.toContain('Amina');
  });

  it('rejects unknown keys, free text, unknown types and over-long batches', async () => {
    const cases: unknown[] = [
      { v: 1, events: [ev(1, { name: 'Amina' })] },
      { v: 1, events: [ev(1, { type: 'writing_saved', stage: 'write', value: { words: 3, text: 'my story' } })] },
      { v: 1, events: [ev(1, { type: 'screenshot' })] },
      { v: 1, events: [] },
      { v: 1, events: Array.from({ length: 51 }, (_, i) => ev(i)) },
      { v: 1, events: [ev(1)], extra: true },
      { v: 2, events: [ev(1)] },
      [],
      'text',
    ];
    for (const body of cases) {
      const { response, stored } = await run(post(JSON.stringify(body)));
      expect(response.status, JSON.stringify(body).slice(0, 80)).toBe(400);
      expect(stored).toHaveLength(0);
    }
  });

  it('answers 403 to an organisation the server was not set up for, and stores none of the batch', async () => {
    const { response, stored } = await run(post({ v: 1, events: [ev(1), ev(2, { org: 'someone-else' })] }));
    expect(response.status).toBe(403);
    expect(stored).toHaveLength(0);
    // Codes in MEASUREMENT_ORGS are trimmed and matched in lower case.
    const second = await run(post({ v: 1, events: [ev(3, { org: 'my-partner' })] }));
    expect(second.response.status).toBe(202);
  });

  it('answers 429 with Retry-After when one pilot code sends too many in a minute, and stores none', async () => {
    const { response, stored } = await run(post({ v: 1, events: [ev(1), ev(2)] }), ENV, { 'HLP-01': MAX_EVENTS_PER_MINUTE - 1 });
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(stored).toHaveLength(0);
    const ok = await run(post({ v: 1, events: [ev(1), ev(2)] }), ENV, { 'HLP-01': MAX_EVENTS_PER_MINUTE - 2 });
    expect(ok.response.status).toBe(202);
    // Another code is counted by itself.
    const other = await run(post({ v: 1, events: [ev(1, { pilotCode: 'HLP-02' })] }), ENV, { 'HLP-01': 10_000 });
    expect(other.response.status).toBe(202);
  });

  it('never puts the database\'s error in an answer', async () => {
    const db: EventsDb = {
      recentCounts: () => Promise.resolve(new Map()),
      insert: () => Promise.reject(new Error('connection to postgres://user:secret@db.example failed')),
    };
    const response = await handleEvents(post({ v: 1, events: [ev(1)] }), { env: ENV, db: () => db });
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('secret');
    expect(text).toBe('{"error":"server_error"}');
  });
});
