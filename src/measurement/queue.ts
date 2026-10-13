/**
 * The pilot measurement queue: events waiting to be sent, kept in a small
 * IndexedDB database of their own (`thinkerwell-measurement`), so a closed
 * tab, a lost connection or a dead battery loses nothing, and so the
 * learners' own database (src/storage) is never touched by measurement.
 * The database is created only when measurement first runs on a device;
 * with sharing off it never exists.
 *
 * Schema versions, as in src/storage/db.ts: to change it, bump
 * QUEUE_DB_VERSION, add migrations[n] (never edit an earlier one: devices in
 * the field have already run it), and add a test to queue.test.ts.
 *
 * If IndexedDB can't be used (some private windows), a queue in memory
 * stands in for this visit.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { MeasurementEvent } from './events';

export const QUEUE_DB_NAME = 'thinkerwell-measurement';
export const QUEUE_DB_VERSION = 1;

/** The most events kept waiting. Past it the oldest go first: a device that can never send must not fill up. */
export const MAX_QUEUED = 3000;

interface QueueDB extends DBSchema {
  events: { key: number; value: MeasurementEvent };
  meta: { key: string; value: unknown };
}

type Migration = (db: IDBPDatabase<QueueDB>) => void;

/** One entry per schema version, applied in order to a database that is behind. */
export const MIGRATIONS: Record<number, Migration> = {
  1(db) {
    // Out-of-line, increasing keys: oldest first, and an id the server sees stays inside the event.
    db.createObjectStore('events', { autoIncrement: true });
    db.createObjectStore('meta');
  },
};

export interface QueuedEvent {
  key: number;
  event: MeasurementEvent;
}

/** Names of the few values kept beside the events. */
export type MetaName = 'deviceId' | 'pausedUntil';

export interface Queue {
  add(event: MeasurementEvent): Promise<void>;
  /** The oldest events, oldest first. */
  peek(limit: number): Promise<QueuedEvent[]>;
  remove(keys: readonly number[]): Promise<void>;
  /** Removes every waiting event for which `test` is true (a learner who was removed). */
  removeWhere(test: (event: MeasurementEvent) => boolean): Promise<void>;
  count(): Promise<number>;
  /** Removes every waiting event and every kept value. */
  clear(): Promise<void>;
  getMeta<T>(name: MetaName): Promise<T | undefined>;
  setMeta(name: MetaName, value: unknown): Promise<void>;
  deleteMeta(name: MetaName): Promise<void>;
  /** True for the stand-in that lives in memory. */
  readonly inMemory: boolean;
  /**
   * Called when the database is closed from outside (it is being deleted, from
   * Settings' "Delete all data" in this tab or another, or the browser
   * closed it): the queue can no longer be used and must be opened again.
   */
  onClosed(callback: () => void): void;
  close(): void;
}

/** A queue in memory: the same behaviour, gone when the page is. */
export function memoryQueue(): Queue {
  let next = 1;
  let events: QueuedEvent[] = [];
  const meta = new Map<string, unknown>();
  return {
    inMemory: true,
    add(event) {
      events.push({ key: next++, event });
      if (events.length > MAX_QUEUED) events = events.slice(events.length - MAX_QUEUED);
      return Promise.resolve();
    },
    peek: (limit) => Promise.resolve(events.slice(0, limit)),
    remove(keys) {
      const gone = new Set(keys);
      events = events.filter((item) => !gone.has(item.key));
      return Promise.resolve();
    },
    removeWhere(test) {
      events = events.filter((item) => !test(item.event));
      return Promise.resolve();
    },
    count: () => Promise.resolve(events.length),
    clear() {
      events = [];
      meta.clear();
      return Promise.resolve();
    },
    getMeta: <T>(name: MetaName) => Promise.resolve(meta.get(name) as T | undefined),
    setMeta(name, value) {
      meta.set(name, value);
      return Promise.resolve();
    },
    deleteMeta(name) {
      meta.delete(name);
      return Promise.resolve();
    },
    onClosed: () => undefined,
    close: () => undefined,
  };
}

function idbQueue(db: IDBPDatabase<QueueDB>, closedCallbacks: Array<() => void>): Queue {
  return {
    inMemory: false,
    onClosed: (callback) => {
      closedCallbacks.push(callback);
    },
    async add(event) {
      const tx = db.transaction('events', 'readwrite');
      await tx.store.add(event);
      const total = await tx.store.count();
      if (total > MAX_QUEUED) {
        // Drop the oldest, with a little room so this isn't done at every event.
        let surplus = total - MAX_QUEUED + Math.ceil(MAX_QUEUED / 10);
        let cursor = await tx.store.openCursor();
        while (cursor && surplus > 0) {
          await cursor.delete();
          surplus -= 1;
          cursor = await cursor.continue();
        }
      }
      await tx.done;
    },
    async peek(limit) {
      const found: QueuedEvent[] = [];
      let cursor = await db.transaction('events').store.openCursor();
      while (cursor && found.length < limit) {
        found.push({ key: cursor.key, event: cursor.value });
        cursor = await cursor.continue();
      }
      return found;
    },
    async remove(keys) {
      if (keys.length === 0) return;
      const tx = db.transaction('events', 'readwrite');
      await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done]);
    },
    async removeWhere(test) {
      const tx = db.transaction('events', 'readwrite');
      let cursor = await tx.store.openCursor();
      while (cursor) {
        if (test(cursor.value)) await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    },
    count: () => db.count('events'),
    async clear() {
      const tx = db.transaction(['events', 'meta'], 'readwrite');
      await Promise.all([tx.objectStore('events').clear(), tx.objectStore('meta').clear(), tx.done]);
    },
    getMeta: async <T>(name: MetaName) => (await db.get('meta', name)) as T | undefined,
    async setMeta(name, value) {
      await db.put('meta', value, name);
    },
    async deleteMeta(name) {
      await db.delete('meta', name);
    },
    close: () => db.close(),
  };
}

/** Opens the queue's database (creating it the first time), or a queue in memory when that isn't possible. */
export async function openQueue(): Promise<Queue> {
  try {
    if (typeof indexedDB === 'undefined') return memoryQueue();
    const closedCallbacks: Array<() => void> = [];
    const closedFromOutside = (database: IDBPDatabase<QueueDB>) => {
      for (const callback of closedCallbacks.splice(0)) callback();
      try {
        database.close();
      } catch {
        // Already closed.
      }
    };
    let opened: IDBPDatabase<QueueDB> | null = null;
    const db = await openDB<QueueDB>(QUEUE_DB_NAME, QUEUE_DB_VERSION, {
      upgrade(database, oldVersion, newVersion) {
        for (let version = oldVersion + 1; version <= (newVersion ?? QUEUE_DB_VERSION); version += 1) MIGRATIONS[version]?.(database);
      },
      // Another tab (or this one) is deleting or upgrading the database: step aside, so it is never kept waiting.
      blocking() {
        if (opened) closedFromOutside(opened);
      },
      terminated() {
        if (opened) closedFromOutside(opened);
      },
    });
    opened = db;
    return idbQueue(db, closedCallbacks);
  } catch {
    return memoryQueue();
  }
}

/** Removes the whole database from this device (used by "Delete unsent results", and by deleteAllData in src/storage). */
export function deleteQueueDatabase(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve();
      const request = indexedDB.deleteDatabase(QUEUE_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
