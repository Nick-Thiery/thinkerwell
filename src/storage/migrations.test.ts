// @vitest-environment node
import { deleteDB, openDB } from 'idb';
import { DB_VERSION, migrations, openStore, openThinkerwellDb, runMigrations, STORE_NAMES } from './index';

let name: string;

beforeEach(() => {
  name = `test-${crypto.randomUUID()}`;
});

afterEach(async () => {
  await deleteDB(name);
});

describe('schema', () => {
  it('creates all six stores with the right keys and indexes', async () => {
    const db = await openThinkerwellDb(name);
    try {
      expect(db.version).toBe(DB_VERSION);
      expect([...db.objectStoreNames].sort()).toEqual(
        ['device', 'learners', 'progress', 'quizAttempts', 'recordings', 'settings'].sort(),
      );
      expect([...STORE_NAMES].sort()).toEqual([...db.objectStoreNames].sort());

      const tx = db.transaction([...STORE_NAMES]);
      const describeStore = (storeName: (typeof STORE_NAMES)[number]) => {
        const store = tx.objectStore(storeName);
        return {
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement,
          indexes: Object.fromEntries(
            [...store.indexNames].map((indexName) => {
              const index = store.index(indexName);
              return [indexName, { keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }];
            }),
          ),
        };
      };

      const nonUnique = { unique: false, multiEntry: false };
      expect(describeStore('learners')).toEqual({
        keyPath: 'id',
        autoIncrement: false,
        indexes: { byCreatedAt: { keyPath: 'createdAt', ...nonUnique } },
      });
      expect(describeStore('progress')).toEqual({
        keyPath: ['learnerId', 'lessonId'],
        autoIncrement: false,
        indexes: {
          byLearner: { keyPath: 'learnerId', ...nonUnique },
          byLearnerUpdated: { keyPath: ['learnerId', 'updatedAt'], ...nonUnique },
        },
      });
      expect(describeStore('quizAttempts')).toEqual({
        keyPath: ['learnerId', 'sectionId'],
        autoIncrement: false,
        indexes: { byLearner: { keyPath: 'learnerId', ...nonUnique } },
      });
      expect(describeStore('recordings')).toEqual({
        keyPath: ['learnerId', 'lessonId'],
        autoIncrement: false,
        indexes: { byLearner: { keyPath: 'learnerId', ...nonUnique } },
      });
      expect(describeStore('settings')).toEqual({ keyPath: null, autoIncrement: false, indexes: {} });
      expect(describeStore('device')).toEqual({ keyPath: null, autoIncrement: false, indexes: {} });
      await tx.done;
    } finally {
      db.close();
    }
  });

  it('keeps data when opened again at the same version', async () => {
    const first = await openStore(name);
    const learner = await first.addLearner({ name: 'Amina', colour: 'lemon' });
    await first.markStageDone(learner.id, 'towns-near-rivers', 'read');
    await first.updateSettings({ saveData: true });
    await first.setCurrentLearnerId(learner.id);
    first.close();

    const second = await openStore(name);
    try {
      expect(await second.listLearners()).toEqual([learner]);
      expect((await second.getProgress(learner.id, 'towns-near-rivers'))?.stagesDone).toEqual(['read']);
      expect((await second.getSettings()).saveData).toBe(true);
      expect(await second.getCurrentLearnerId()).toBe(learner.id);
    } finally {
      second.close();
    }
  });
});

describe('migrations', () => {
  it('has a migration for every version from 1 to DB_VERSION, and none beyond', () => {
    const versions = Object.keys(migrations)
      .map(Number)
      .sort((a, b) => a - b);
    expect(versions).toEqual(Array.from({ length: DB_VERSION }, (_, i) => i + 1));
  });

  it('refuses to upgrade past a version with no migration', () => {
    // It throws before touching the database, so stand-ins are enough.
    expect(() => runMigrations({} as never, {} as never, DB_VERSION, DB_VERSION + 1)).toThrow(
      `no migration to version ${DB_VERSION + 1}`,
    );
  });

  it('runs each migration from oldVersion + 1 in order', () => {
    const calls: number[] = [];
    const spies = Object.keys(migrations).map((version) =>
      vi.spyOn(migrations, Number(version)).mockImplementation(() => calls.push(Number(version))),
    );
    runMigrations({} as never, {} as never, 0);
    expect(calls).toEqual(Array.from({ length: DB_VERSION }, (_, i) => i + 1));
    calls.length = 0;
    runMigrations({} as never, {} as never, DB_VERSION);
    expect(calls).toEqual([]);
    spies.forEach((spy) => spy.mockRestore());
  });

  it('closes when a newer version in another tab needs to upgrade', async () => {
    const onClose = vi.fn();
    const db = await openThinkerwellDb(name, { onClose });
    // Another tab opening a newer version: this connection must step aside
    // (close) or that open would wait for ever.
    const newer = await openDB(name, DB_VERSION + 1);
    expect(onClose).toHaveBeenCalledTimes(1);
    newer.close();
    db.close();
  });
});
