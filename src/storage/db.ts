/**
 * The IndexedDB database behind Thinkerwell's on-device storage: its schema,
 * its migrations and how it is opened. Nothing in it ever leaves the device.
 *
 * Most code should use the typed API in ./store.ts rather than this file.
 */
import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from 'idb';
import type {
  DeviceKey,
  DeviceSettings,
  DeviceValues,
  Learner,
  LessonProgress,
  Recording,
  SectionQuizRecord,
} from './types';

export const DB_NAME = 'thinkerwell';

/**
 * The schema version. To change the schema (a new store, index or field that
 * needs existing records rewritten):
 *   1. Bump DB_VERSION (to 2, then 3, ...).
 *   2. Add migrations[2] below. It receives the upgrade transaction, so it can
 *      create stores or indexes and read or rewrite existing records through
 *      `tx.objectStore(...)`. Never edit an earlier migration: devices in the
 *      field have already run it.
 *   3. Update ./types.ts and ThinkerwellDB to the new shape.
 *   4. Add a test to ./migrations.test.ts that opens a version-1 database with
 *      data in it, upgrades it and checks the data survived.
 */
export const DB_VERSION = 1;

/** The key of the one record in the `settings` store. */
export const SETTINGS_KEY = 'device';

export interface ThinkerwellDB extends DBSchema {
  learners: {
    key: string;
    value: Learner;
    indexes: { byCreatedAt: string };
  };
  progress: {
    key: [learnerId: string, lessonId: string];
    value: LessonProgress;
    indexes: {
      byLearner: string;
      /** Newest last, so "continue where you left off" is one reverse cursor. */
      byLearnerUpdated: [learnerId: string, updatedAt: string];
    };
  };
  quizAttempts: {
    key: [learnerId: string, sectionId: string];
    value: SectionQuizRecord;
    indexes: { byLearner: string };
  };
  recordings: {
    key: [learnerId: string, lessonId: string];
    value: Recording;
    indexes: { byLearner: string };
  };
  settings: {
    key: typeof SETTINGS_KEY;
    value: DeviceSettings;
  };
  device: {
    key: DeviceKey;
    value: DeviceValues[DeviceKey];
  };
}

export type ThinkerwellStoreName = StoreNames<ThinkerwellDB>;
export type UpgradeTransaction = IDBPTransaction<ThinkerwellDB, ThinkerwellStoreName[], 'versionchange'>;
export type Migration = (db: IDBPDatabase<ThinkerwellDB>, tx: UpgradeTransaction, oldVersion: number) => void;

/** Every store the current schema has, for checks and tests. */
export const STORE_NAMES: readonly ThinkerwellStoreName[] = [
  'learners',
  'progress',
  'quizAttempts',
  'recordings',
  'settings',
  'device',
];

/**
 * Migrations keyed by the version they upgrade TO. Opening runs every one from
 * oldVersion + 1 up to DB_VERSION, in order, inside the upgrade transaction.
 */
export const migrations: Record<number, Migration> = {
  1: (db) => {
    const learners = db.createObjectStore('learners', { keyPath: 'id' });
    learners.createIndex('byCreatedAt', 'createdAt');

    const progress = db.createObjectStore('progress', { keyPath: ['learnerId', 'lessonId'] });
    progress.createIndex('byLearner', 'learnerId');
    progress.createIndex('byLearnerUpdated', ['learnerId', 'updatedAt']);

    const quizAttempts = db.createObjectStore('quizAttempts', { keyPath: ['learnerId', 'sectionId'] });
    quizAttempts.createIndex('byLearner', 'learnerId');

    const recordings = db.createObjectStore('recordings', { keyPath: ['learnerId', 'lessonId'] });
    recordings.createIndex('byLearner', 'learnerId');

    db.createObjectStore('settings');
    db.createObjectStore('device');
  },
};

/** Runs the migrations needed to go from oldVersion to newVersion. */
export function runMigrations(
  db: IDBPDatabase<ThinkerwellDB>,
  tx: UpgradeTransaction,
  oldVersion: number,
  newVersion: number = DB_VERSION,
): void {
  for (let version = oldVersion + 1; version <= newVersion; version++) {
    const migrate = migrations[version];
    if (!migrate) throw new Error(`Thinkerwell storage: no migration to version ${version}`);
    migrate(db, tx, oldVersion);
  }
}

export interface OpenOptions {
  /**
   * Called when this connection closes on its own: another tab needs to
   * upgrade the database, or the browser ended the connection. The caller
   * should drop the connection and open a new one next time.
   */
  onClose?: () => void;
}

/**
 * Opens (creating or upgrading if needed) the Thinkerwell database.
 * `name` exists so tests can use a fresh database each time.
 */
export async function openThinkerwellDb(
  name: string = DB_NAME,
  { onClose }: OpenOptions = {},
): Promise<IDBPDatabase<ThinkerwellDB>> {
  const db: IDBPDatabase<ThinkerwellDB> = await openDB<ThinkerwellDB>(name, DB_VERSION, {
    upgrade(database, oldVersion, newVersion, transaction) {
      runMigrations(database, transaction, oldVersion, newVersion ?? DB_VERSION);
    },
    blocked(currentVersion, blockedVersion) {
      // Another tab still has an older version open. The open finishes once
      // that tab closes its connection (it does so in its `blocking` handler).
      console.warn(
        `Thinkerwell storage: waiting for another tab to close version ${currentVersion} before opening ${String(blockedVersion)}.`,
      );
    },
    blocking() {
      // A newer version is trying to open in another tab: step aside so it can upgrade.
      db.close();
      onClose?.();
    },
    terminated() {
      console.warn('Thinkerwell storage: the browser closed the database connection.');
      onClose?.();
    },
  });
  return db;
}
