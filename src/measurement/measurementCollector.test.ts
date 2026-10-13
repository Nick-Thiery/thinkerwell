import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  ACTIVE_WITHIN_MS,
  Collector,
  HEARTBEAT_EVERY_MS,
  NEW_SESSION_AFTER_MS,
  WRITING_QUIET_MS,
} from './measurementCollector';
import { checkBatch, type MeasurementEvent } from './events';
import { memoryQueue, QUEUE_DB_NAME, type Queue } from './queue';

const ORG = 'help-jakarta';
const GATE = { org: ORG, pilotCode: 'HLP-01' };
const OTHER = { org: ORG, pilotCode: 'HLP-02' };

describe('Collector', () => {
  let queue: Queue;
  let fetchFn: Mock<() => Promise<Response>>;
  let collector: Collector;
  let visibility: DocumentVisibilityState;
  // Offline unless a test is about sending, so what is queued can be looked at.
  let online: boolean;

  const waiting = async (): Promise<MeasurementEvent[]> => (await queue.peek(1000)).map((item) => item.event);
  const types = async () => (await waiting()).map((event) => event.type);
  const settle = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers({ now: 1_790_000_000_000 });
    queue = memoryQueue();
    fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 202 })));
    visibility = 'visible';
    online = false;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    collector = new Collector({
      queue: () => Promise.resolve(queue),
      sender: { fetchFn: fetchFn as unknown as typeof fetch, online: () => online, random: () => 0.5 },
    });
  });
  afterEach(async () => {
    await collector.applyGate(null, null);
    vi.useRealTimers();
  });

  it('is off: nothing is queued, nothing is sent, and no database is made', async () => {
    const open = vi.fn(() => Promise.resolve(queue));
    const off = new Collector({ queue: open, sender: { fetchFn: fetchFn as unknown as typeof fetch } });
    await off.applyGate(null, null);
    off.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    off.record(GATE, 'stage_enter', { lessonId: 'towns-near-rivers', stage: 'read' });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(open).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await queue.count()).toBe(0);
    expect((await indexedDB.databases()).map((entry) => entry.name)).not.toContain(QUEUE_DB_NAME);
  });

  it('is on but with nobody measured (no pilot code, look-around): nothing is queued', async () => {
    await collector.applyGate(ORG, null);
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    await vi.advanceTimersByTimeAsync(90_000);
    expect(await queue.count()).toBe(0);
  });

  it('starts a session when a learner with a pilot code is on and records what they do, in order', async () => {
    await collector.applyGate(ORG, GATE);
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    collector.record(GATE, 'stage_enter', { lessonId: 'towns-near-rivers', stage: 'read' });
    collector.record(GATE, 'quick_check_answer', {
      lessonId: 'towns-near-rivers',
      value: { q: 0, selected: 1, correct: true, attempt: 1 },
    });
    await settle();
    const events = await waiting();
    expect(events.map((event) => event.type)).toEqual(['session_start', 'lesson_open', 'stage_enter', 'quick_check_answer']);
    for (const event of events) {
      expect(event.org).toBe(ORG);
      expect(event.pilotCode).toBe('HLP-01');
      expect(event.sessionId).toBe(events[0]!.sessionId);
      expect(event.deviceId).toBe(events[0]!.deviceId);
      expect(event.ts).toBe(1_790_000_000_000);
    }
    // The device id is random and kept beside the events, for this use of sharing only.
    expect(await queue.getMeta('deviceId')).toBe(events[0]!.deviceId);
  });

  it('only records for the learner who is measured now', async () => {
    await collector.applyGate(ORG, GATE);
    collector.record(OTHER, 'lesson_open', { lessonId: 'towns-near-rivers' });
    await settle();
    expect(await types()).toEqual(['session_start']);
  });

  it('sends what is queued to /api/events after a short wait, in a batch the server accepts', async () => {
    online = true;
    await collector.applyGate(ORG, GATE);
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    await vi.advanceTimersByTimeAsync(6_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/events');
    const body = JSON.parse(init.body as string) as unknown;
    const checked = checkBatch(body);
    expect(checked.ok).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/name|email|recording/i);
    expect(await queue.count()).toBe(0);
  });

  it('counts a minute only while someone is there: heartbeats need input and a visible page', async () => {
    await collector.applyGate(ORG, GATE);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS);
    expect(await types()).toContain('heartbeat');
    const first = (await types()).filter((type) => type === 'heartbeat').length;
    // No input for longer than the active window: no more heartbeats.
    await vi.advanceTimersByTimeAsync(ACTIVE_WITHIN_MS + HEARTBEAT_EVERY_MS * 2);
    const afterIdle = (await types()).filter((type) => type === 'heartbeat').length;
    expect(afterIdle).toBeLessThanOrEqual(first + 2);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS * 4);
    expect((await types()).filter((type) => type === 'heartbeat').length).toBe(afterIdle);
    // A touch makes the next heartbeat count.
    window.dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS);
    expect((await types()).filter((type) => type === 'heartbeat').length).toBe(afterIdle + 1);
    // Hidden page: none.
    visibility = 'hidden';
    window.dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS * 2);
    expect((await types()).filter((type) => type === 'heartbeat').length).toBe(afterIdle + 1);
  });

  it('names the lesson and step in a heartbeat, until the learner leaves the lessons', async () => {
    await collector.applyGate(ORG, GATE);
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    collector.record(GATE, 'stage_enter', { lessonId: 'towns-near-rivers', stage: 'write' });
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS);
    let beats = (await waiting()).filter((event) => event.type === 'heartbeat');
    expect(beats[0]).toMatchObject({ lessonId: 'towns-near-rivers', stage: 'write' });
    collector.leaveLesson();
    window.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS);
    beats = (await waiting()).filter((event) => event.type === 'heartbeat');
    expect(beats[beats.length - 1]!.lessonId).toBeUndefined();
  });

  it('sends one word count after typing stops, never the words', async () => {
    await collector.applyGate(ORG, GATE);
    for (const words of [3, 8, 15]) {
      collector.record(GATE, 'writing_saved', { lessonId: 'towns-near-rivers', stage: 'write', value: { words } });
      await vi.advanceTimersByTimeAsync(2_000);
    }
    expect((await types()).filter((type) => type === 'writing_saved')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(WRITING_QUIET_MS);
    const saved = (await waiting()).filter((event) => event.type === 'writing_saved');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ stage: 'write', value: { words: 15 } });
  });

  it('writes the pending word count before the next step starts', async () => {
    await collector.applyGate(ORG, GATE);
    collector.record(GATE, 'writing_saved', { lessonId: 'towns-near-rivers', stage: 'write', value: { words: 9 } });
    collector.record(GATE, 'stage_enter', { lessonId: 'towns-near-rivers', stage: 'watch' });
    await settle();
    expect((await types()).slice(-2)).toEqual(['writing_saved', 'stage_enter']);
  });

  it('drops an event that does not pass the same check the server runs', async () => {
    await collector.applyGate(ORG, GATE);
    // A sentence in place of a number, a name for a lesson.
    collector.record(GATE, 'writing_saved', { lessonId: 'towns-near-rivers', stage: 'write', value: { words: 'I like rivers' as unknown as number } });
    collector.record(GATE, 'lesson_open', { lessonId: 'Amina and the river' });
    await vi.advanceTimersByTimeAsync(WRITING_QUIET_MS + 1000);
    expect(await types()).toEqual(['session_start']);
  });

  it('ends one session and starts another when the learner changes', async () => {
    await collector.applyGate(ORG, GATE);
    await collector.applyGate(ORG, OTHER);
    await settle();
    const events = await waiting();
    expect(events.map((event) => [event.type, event.pilotCode])).toEqual([
      ['session_start', 'HLP-01'],
      ['session_end', 'HLP-01'],
      ['session_start', 'HLP-02'],
    ]);
    expect(events[2]!.sessionId).not.toBe(events[0]!.sessionId);
  });

  it('does not start again for the same learner when a setting is saved', async () => {
    await collector.applyGate(ORG, GATE);
    await collector.applyGate(ORG, { ...GATE });
    await settle();
    expect(await types()).toEqual(['session_start']);
  });

  it('ends the session and keeps going with no learner (a look-around)', async () => {
    await collector.applyGate(ORG, GATE);
    await collector.applyGate(ORG, null);
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    await settle();
    expect(await types()).toEqual(['session_start', 'session_end']);
  });

  it('turning sharing off deletes what is waiting and stops everything', async () => {
    await collector.applyGate(ORG, GATE);
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    await settle();
    expect(await queue.count()).toBeGreaterThan(0);
    await collector.applyGate(null, null);
    expect(await queue.count()).toBe(0);
    expect(await queue.getMeta('deviceId')).toBeUndefined();
    collector.record(GATE, 'lesson_open', { lessonId: 'towns-near-rivers' });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await queue.count()).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('a new session starts after a long time away', async () => {
    await collector.applyGate(ORG, GATE);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(NEW_SESSION_AFTER_MS + 1000);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(await types()).toEqual(['session_start', 'session_end', 'session_start']);
  });

  it('a short time away is the same session', async () => {
    await collector.applyGate(ORG, GATE);
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60_000);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect((await types()).filter((type) => type === 'session_start')).toHaveLength(1);
  });

  it('forgets one learner\'s waiting results when they are removed', async () => {
    await collector.applyGate(ORG, GATE);
    await collector.applyGate(ORG, OTHER);
    await settle();
    await collector.forgetPilotCode('HLP-01');
    const left = await waiting();
    expect(left.length).toBeGreaterThan(0);
    expect(left.every((event) => event.pilotCode === 'HLP-02')).toBe(true);
  });

  it('reports how many results wait, for Settings', async () => {
    await collector.applyGate(ORG, GATE);
    await settle();
    expect(await collector.status()).toEqual({ pending: 1, pausedUntil: null });
  });

  it('stops quietly when the server is not set up (503), and keeps the results', async () => {
    online = true;
    fetchFn.mockImplementation(() => Promise.resolve(new Response('{"error":"not_configured"}', { status: 503 })));
    await collector.applyGate(ORG, GATE);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 60_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect((await collector.status()).pausedUntil).not.toBeNull();
    expect(await queue.count()).toBeGreaterThan(0);
  });
});
