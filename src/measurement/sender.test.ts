import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_BATCH_EVENTS, type MeasurementEvent } from './events';
import { memoryQueue, type Queue } from './queue';
import {
  BACKOFF_MAX_MS,
  EVENTS_ENDPOINT,
  PAUSE_NOT_CONFIGURED_MS,
  PAUSE_REFUSED_MS,
  SEND_DELAY_MS,
  Sender,
} from './sender';

function ev(n: number): MeasurementEvent {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    org: 'help-jakarta',
    pilotCode: 'HLP-01',
    deviceId: '0a4d8f52-1c3b-4e7a-8b6d-9f2e5c7a1b30',
    sessionId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    type: 'listen_play',
    lessonId: 'towns-near-rivers',
    value: {},
    ts: 1_790_000_000_000 + n,
    appVersion: 'test',
  };
}

type Call = { url: string; init: RequestInit; body: { v: number; events: MeasurementEvent[] } };

describe('Sender', () => {
  let queue: Queue;
  let calls: Call[];
  let answers: Array<Response | Error>;
  let online: boolean;
  let clock: number;
  let sender: Sender;

  const reply = (status: number, headers: Record<string, string> = {}) => new Response(status === 204 ? null : '{}', { status, headers });

  beforeEach(() => {
    vi.useFakeTimers();
    queue = memoryQueue();
    calls = [];
    answers = [];
    online = true;
    clock = 1_000_000;
    const fetchFn = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: typeof url === 'string' ? url : url instanceof URL ? url.href : url.url, init: init ?? {}, body: JSON.parse(init?.body as string) as Call['body'] });
      const next = answers.shift() ?? reply(202);
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    }) as unknown as typeof fetch;
    sender = new Sender({ queue: () => Promise.resolve(queue), fetchFn, now: () => clock, online: () => online, random: () => 0.5 });
  });
  afterEach(() => {
    sender.stop();
    vi.useRealTimers();
  });

  const fill = async (count: number) => {
    for (let n = 1; n <= count; n += 1) await queue.add(ev(n));
  };

  it('sends nothing before its delay, then one request with everything waiting', async () => {
    await fill(3);
    sender.poke();
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS - 1);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(EVENTS_ENDPOINT);
    expect(calls[0]!.body.v).toBe(1);
    expect(calls[0]!.body.events).toHaveLength(3);
    expect(await queue.count()).toBe(0);
  });

  it('asks for nothing that identifies the visitor: no cookies, no referrer', async () => {
    await fill(1);
    await sender.flushNow();
    const init = calls[0]!.init;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(init.referrerPolicy).toBe('no-referrer');
    expect(init.redirect).toBe('error');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('sends in batches of at most 50', async () => {
    await fill(120);
    await sender.flushNow();
    expect(calls.map((call) => call.body.events.length)).toEqual([MAX_BATCH_EVENTS, MAX_BATCH_EVENTS, 20]);
    expect(await queue.count()).toBe(0);
  });

  it('sends nothing while offline, and keeps the queue', async () => {
    online = false;
    await fill(2);
    await sender.flushNow();
    expect(calls).toHaveLength(0);
    expect(await queue.count()).toBe(2);
    online = true;
    await sender.flushNow();
    expect(calls).toHaveLength(1);
    expect(await queue.count()).toBe(0);
  });

  it('treats 503 as "not configured": stops quietly for hours, remembers it, and keeps the events', async () => {
    await fill(2);
    answers = [reply(503)];
    await sender.flushNow();
    expect(calls).toHaveLength(1);
    expect(await queue.count()).toBe(2);
    expect(await queue.getMeta('pausedUntil')).toBe(clock + PAUSE_NOT_CONFIGURED_MS);
    // Another flush, even a new sender on the same queue (a page load), asks nothing.
    await sender.flushNow();
    const later = new Sender({ queue: () => Promise.resolve(queue), fetchFn: vi.fn(), now: () => clock, online: () => true });
    await later.flushNow();
    later.stop();
    expect(calls).toHaveLength(1);
    // After the pause it tries again.
    clock += PAUSE_NOT_CONFIGURED_MS + 1;
    await sender.flushNow();
    expect(calls).toHaveLength(2);
    expect(await queue.count()).toBe(0);
  });

  it.each([404, 405])('treats %i like 503', async (status) => {
    await fill(1);
    answers = [reply(status)];
    await sender.flushNow();
    expect(await queue.count()).toBe(1);
    expect(await queue.getMeta('pausedUntil')).toBe(clock + PAUSE_NOT_CONFIGURED_MS);
  });

  it.each([400, 403, 415])('drops a batch the server refuses with %i, and waits an hour', async (status) => {
    await fill(3);
    answers = [reply(status)];
    await sender.flushNow();
    expect(await queue.count()).toBe(0);
    expect(await queue.getMeta('pausedUntil')).toBe(clock + PAUSE_REFUSED_MS);
  });

  it('backs off after 429 and 5xx, keeping the events, and obeys Retry-After', async () => {
    await fill(2);
    answers = [reply(429, { 'retry-after': '60' }), reply(500), reply(202)];
    await sender.flushNow();
    expect(calls).toHaveLength(1);
    expect(await queue.count()).toBe(2);
    // Retry-After of 60 s beats the 15 s first backoff.
    await vi.advanceTimersByTimeAsync(59_000);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(calls).toHaveLength(2);
    // The second failure doubles the wait (30 s).
    await vi.advanceTimersByTimeAsync(28_000);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(calls).toHaveLength(3);
    expect(await queue.count()).toBe(0);
  });

  it('keeps the queue when the connection fails, backing off from 15 s to a cap of 15 minutes', async () => {
    await fill(1);
    answers = Array.from({ length: 30 }, () => new TypeError('Failed to fetch'));
    const times: number[] = [];
    const original = calls.push.bind(calls);
    calls.push = (...items: Call[]) => {
      times.push(Date.now());
      return original(...items);
    };
    await sender.flushNow();
    await vi.advanceTimersByTimeAsync(3 * 60 * 60_000);
    const gaps = times.slice(1).map((time, i) => time - times[i]!);
    expect(gaps.slice(0, 7)).toEqual([15_000, 30_000, 60_000, 120_000, 240_000, 480_000, 900_000]);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(BACKOFF_MAX_MS);
    expect(await queue.count()).toBe(1);
  });

  it('halves the batch on 413 and a single oversize event is dropped', async () => {
    await fill(10);
    answers = [reply(413), reply(202), reply(202)];
    await sender.flushNow();
    expect(calls.map((call) => call.body.events.length)).toEqual([10, 5, 5]);
    expect(await queue.count()).toBe(0);
  });

  it('does nothing after stop (sharing turned off)', async () => {
    await fill(2);
    sender.poke();
    sender.stop();
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS * 3);
    await sender.flushNow();
    expect(calls).toHaveLength(0);
  });

  it('sends one request at a time', async () => {
    await fill(2);
    await Promise.all([sender.flushNow(), sender.flushNow(), sender.flushNow()]);
    expect(calls).toHaveLength(1);
  });
});
