import { readFileSync } from 'node:fs';
import { deleteDB, openDB } from 'idb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MeasurementEvent } from './events';
import { deleteQueueDatabase, MAX_QUEUED, memoryQueue, MIGRATIONS, openQueue, QUEUE_DB_NAME, QUEUE_DB_VERSION, type Queue } from './queue';

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

async function databaseNames(): Promise<string[]> {
  const list = await indexedDB.databases();
  return list.map((entry) => entry.name ?? '');
}

describe('the queue database', () => {
  beforeEach(async () => {
    await deleteDB(QUEUE_DB_NAME);
  });
  afterEach(async () => {
    await deleteDB(QUEUE_DB_NAME);
  });

  it('is not created until measurement opens it', async () => {
    expect(await databaseNames()).not.toContain(QUEUE_DB_NAME);
    const queue = await openQueue();
    expect(await databaseNames()).toContain(QUEUE_DB_NAME);
    queue.close();
  });

  it('keeps events oldest first, and removes the ones that were sent', async () => {
    const queue = await openQueue();
    expect(queue.inMemory).toBe(false);
    for (const n of [1, 2, 3, 4]) await queue.add(ev(n));
    expect(await queue.count()).toBe(4);
    const firstTwo = await queue.peek(2);
    expect(firstTwo.map((item) => item.event.ts - 1_790_000_000_000)).toEqual([1, 2]);
    await queue.remove(firstTwo.map((item) => item.key));
    const rest = await queue.peek(10);
    expect(rest.map((item) => item.event.ts - 1_790_000_000_000)).toEqual([3, 4]);
    queue.close();
  });

  it('survives closing and opening again (a closed tab)', async () => {
    const first = await openQueue();
    await first.add(ev(1));
    await first.setMeta('deviceId', 'abc');
    first.close();
    const second = await openQueue();
    expect(await second.count()).toBe(1);
    expect(await second.getMeta('deviceId')).toBe('abc');
    second.close();
  });

  it('removes waiting events for one learner, and clears everything', async () => {
    const queue = await openQueue();
    await queue.add(ev(1));
    await queue.add({ ...ev(2), pilotCode: 'HLP-02' });
    await queue.removeWhere((event) => event.pilotCode === 'HLP-01');
    expect((await queue.peek(10)).map((item) => item.event.pilotCode)).toEqual(['HLP-02']);
    await queue.setMeta('pausedUntil', 5);
    await queue.clear();
    expect(await queue.count()).toBe(0);
    expect(await queue.getMeta('pausedUntil')).toBeUndefined();
    queue.close();
  });

  it('drops the oldest past its cap, so a device that can never send does not fill up', async () => {
    const queue = await openQueue();
    for (let n = 0; n < MAX_QUEUED + 5; n += 1) await queue.add(ev(n));
    const count = await queue.count();
    expect(count).toBeLessThanOrEqual(MAX_QUEUED);
    expect(count).toBeGreaterThan(MAX_QUEUED - Math.ceil(MAX_QUEUED / 10) - 5);
    const oldest = (await queue.peek(1))[0]!;
    expect(oldest.event.ts - 1_790_000_000_000).toBeGreaterThan(0);
    const all = await queue.peek(MAX_QUEUED + 10);
    expect(all[all.length - 1]!.event.ts - 1_790_000_000_000).toBe(MAX_QUEUED + 4);
    queue.close();
  }, 60_000);

  it('can be deleted whole', async () => {
    const queue = await openQueue();
    await queue.add(ev(1));
    queue.close();
    await deleteQueueDatabase();
    expect(await databaseNames()).not.toContain(QUEUE_DB_NAME);
  });

  it('steps aside when the database is deleted from outside, so "Delete all data" is never kept waiting', async () => {
    const queue = await openQueue();
    await queue.add(ev(1));
    let closed = 0;
    queue.onClosed(() => {
      closed += 1;
    });
    await deleteDB(QUEUE_DB_NAME);
    expect(closed).toBe(1);
    expect(await databaseNames()).not.toContain(QUEUE_DB_NAME);
  });

  it('upgrades a database that is behind (migrations apply in order)', async () => {
    // A database at version 0 does not exist yet: opening it runs migration 1.
    const queue = await openQueue();
    queue.close();
    const db = await openDB(QUEUE_DB_NAME);
    expect(db.version).toBe(QUEUE_DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual(['events', 'meta']);
    db.close();
  });

  it('has one migration for each version, with none missing', () => {
    const versions = Object.keys(MIGRATIONS).map(Number).sort((a, b) => a - b);
    expect(versions).toEqual(Array.from({ length: QUEUE_DB_VERSION }, (_, i) => i + 1));
  });

  it('is the database that deleteAllData removes', () => {
    const store = readFileSync('src/storage/store.ts', 'utf8');
    expect(store).toContain(`'${QUEUE_DB_NAME}'`);
  });
});

describe('the queue in memory', () => {
  let queue: Queue;
  beforeEach(() => {
    queue = memoryQueue();
  });

  it('behaves the same', async () => {
    expect(queue.inMemory).toBe(true);
    for (const n of [1, 2, 3]) await queue.add(ev(n));
    const peeked = await queue.peek(2);
    expect(peeked).toHaveLength(2);
    await queue.remove([peeked[0]!.key]);
    expect(await queue.count()).toBe(2);
    await queue.removeWhere((event) => event.ts === 1_790_000_000_003);
    expect(await queue.count()).toBe(1);
    await queue.setMeta('pausedUntil', 9);
    expect(await queue.getMeta('pausedUntil')).toBe(9);
    await queue.deleteMeta('pausedUntil');
    expect(await queue.getMeta('pausedUntil')).toBeUndefined();
    await queue.clear();
    expect(await queue.count()).toBe(0);
  });

  it('is capped too', async () => {
    for (let n = 0; n < MAX_QUEUED + 3; n += 1) await queue.add(ev(n));
    expect(await queue.count()).toBe(MAX_QUEUED);
  }, 30_000);
});
