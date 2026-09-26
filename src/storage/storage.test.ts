// @vitest-environment node
// Node's Blob, unlike jsdom's, survives fake-indexeddb's structured clone, as
// Blobs do in real browsers. Storage needs no DOM, so these tests run in node.
import { deleteDB } from 'idb';
import {
  DB_NAME,
  DEFAULT_SETTINGS,
  deleteAllData,
  emptyProgress,
  getStore,
  isStorageAvailable,
  openStore,
  openThinkerwellDb,
  type QuizAttempt,
  type ThinkerwellStore,
} from './index';

let name: string;
let store: ThinkerwellStore;

beforeEach(async () => {
  name = `test-${crypto.randomUUID()}`;
  store = await openStore(name);
});

afterEach(async () => {
  vi.useRealTimers();
  store.close();
  await deleteDB(name);
});

/** Fakes only Date, so fake-indexeddb's own scheduling keeps running. */
function setTime(iso: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

function attempt(score: number, finishedAt: string, total = 8): QuizAttempt {
  return { answers: { q1: 0 }, score, total, finishedAt };
}

describe('learners', () => {
  it('adds a learner with an id, a trimmed name and a created date', async () => {
    setTime('2026-01-02T03:04:05.000Z');
    const learner = await store.addLearner({ name: '  Amina ', colour: 'lavender' });
    expect(learner.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(learner.name).toBe('Amina');
    expect(learner.createdAt).toBe('2026-01-02T03:04:05.000Z');
    expect(learner).not.toHaveProperty('classCode');
    expect(await store.getLearner(learner.id)).toEqual(learner);
  });

  it('keeps a class code, trimmed, and drops a blank one', async () => {
    const withCode = await store.addLearner({ name: 'Omar', colour: 'civics', classCode: ' HLP-07 ' });
    const blank = await store.addLearner({ name: 'Sara', colour: 'culture', classCode: '   ' });
    expect(withCode.classCode).toBe('HLP-07');
    expect(blank).not.toHaveProperty('classCode');
    expect(await store.getLearner(blank.id)).not.toHaveProperty('classCode');
  });

  it('rejects an empty or whitespace name and an unknown colour', async () => {
    await expect(store.addLearner({ name: '', colour: 'lemon' })).rejects.toThrow(/name/);
    await expect(store.addLearner({ name: '   ', colour: 'lemon' })).rejects.toThrow(/name/);
    // @ts-expect-error: a colour outside LEARNER_COLOURS
    await expect(store.addLearner({ name: 'Ali', colour: 'red' })).rejects.toThrow(/colour/);
    expect(await store.listLearners()).toEqual([]);
  });

  it('lists learners oldest first', async () => {
    setTime('2026-03-01T10:00:00.000Z');
    const b = await store.addLearner({ name: 'B', colour: 'lemon' });
    setTime('2026-01-01T10:00:00.000Z');
    const a = await store.addLearner({ name: 'A', colour: 'lemon' });
    setTime('2026-02-01T10:00:00.000Z');
    const c = await store.addLearner({ name: 'C', colour: 'lemon' });
    expect((await store.listLearners()).map((l) => l.id)).toEqual([a.id, c.id, b.id]);
  });

  it('updates name, colour and class code', async () => {
    const learner = await store.addLearner({ name: 'Amina', colour: 'lavender', classCode: 'HLP-01' });
    const renamed = await store.updateLearner(learner.id, { name: ' Mina ', colour: 'geography' });
    expect(renamed).toEqual({ ...learner, name: 'Mina', colour: 'geography' });

    const noCode = await store.updateLearner(learner.id, { classCode: '' });
    expect(noCode).not.toHaveProperty('classCode');
    const newCode = await store.updateLearner(learner.id, { classCode: 'HLP-02' });
    expect(newCode.classCode).toBe('HLP-02');
    const cleared = await store.updateLearner(learner.id, { classCode: undefined });
    expect(cleared).not.toHaveProperty('classCode');

    expect(await store.getLearner(learner.id)).toEqual(cleared);
    expect(cleared.id).toBe(learner.id);
    expect(cleared.createdAt).toBe(learner.createdAt);
  });

  it('throws when updating a missing learner or with an empty name', async () => {
    await expect(store.updateLearner('nobody', { name: 'X' })).rejects.toThrow(/No learner/);
    const learner = await store.addLearner({ name: 'Amina', colour: 'lavender' });
    await expect(store.updateLearner(learner.id, { name: '  ' })).rejects.toThrow(/name/);
    expect((await store.getLearner(learner.id))?.name).toBe('Amina');
  });
});

describe('removeLearner', () => {
  it("deletes only that learner's progress, quiz attempts and recordings, and clears the current learner", async () => {
    const amina = await store.addLearner({ name: 'Amina', colour: 'lavender' });
    const omar = await store.addLearner({ name: 'Omar', colour: 'civics' });
    for (const id of [amina.id, omar.id]) {
      await store.markStageDone(id, 'towns-near-rivers', 'read');
      await store.markStageDone(id, 'history-scale', 'write');
      await store.recordQuizAttempt(id, 'history', attempt(5, '2026-01-01T00:00:00.000Z'));
      await store.recordQuizAttempt(id, 'geography', attempt(6, '2026-01-01T00:00:00.000Z'));
      await store.saveRecording(id, 'towns-near-rivers', new Blob(['clip'], { type: 'audio/webm' }), 1200);
    }
    await store.setCurrentLearnerId(amina.id);

    await store.removeLearner(amina.id);

    expect(await store.getLearner(amina.id)).toBeUndefined();
    expect(await store.listProgress(amina.id)).toEqual([]);
    expect(await store.listQuizRecords(amina.id)).toEqual([]);
    expect(await store.getRecording(amina.id, 'towns-near-rivers')).toBeUndefined();
    expect(await store.getCurrentLearnerId()).toBeNull();

    expect(await store.listLearners()).toEqual([omar]);
    expect(await store.listProgress(omar.id)).toHaveLength(2);
    expect(await store.listQuizRecords(omar.id)).toHaveLength(2);
    expect(await store.getRecording(omar.id, 'towns-near-rivers')).toBeDefined();
  });

  it('leaves the current learner alone when removing someone else', async () => {
    const amina = await store.addLearner({ name: 'Amina', colour: 'lavender' });
    const omar = await store.addLearner({ name: 'Omar', colour: 'civics' });
    await store.setCurrentLearnerId(omar.id);
    await store.removeLearner(amina.id);
    expect(await store.getCurrentLearnerId()).toBe(omar.id);
  });

  it('deletes nothing if any step fails', async () => {
    const amina = await store.addLearner({ name: 'Amina', colour: 'lavender' });
    await store.markStageDone(amina.id, 'towns-near-rivers', 'read');
    await store.recordQuizAttempt(amina.id, 'history', attempt(5, '2026-01-01T00:00:00.000Z'));
    await store.saveRecording(amina.id, 'towns-near-rivers', new Blob(['clip'], { type: 'audio/webm' }), 1200);
    await store.setCurrentLearnerId(amina.id);

    // Let the first deletes through, then fail one part-way.
    const proto = IDBObjectStore.prototype;
    const realDelete: (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) => IDBRequest<undefined> =
      Reflect.get(proto, 'delete');
    let calls = 0;
    vi.spyOn(proto, 'delete').mockImplementation(function (this: IDBObjectStore, key) {
      calls += 1;
      if (calls === 3) throw new DOMException('Disk full', 'UnknownError');
      return realDelete.call(this, key);
    });

    await expect(store.removeLearner(amina.id)).rejects.toThrow('Disk full');
    vi.restoreAllMocks();

    expect(await store.getLearner(amina.id)).toEqual(amina);
    expect(await store.listProgress(amina.id)).toHaveLength(1);
    expect(await store.listQuizRecords(amina.id)).toHaveLength(1);
    expect(await store.getRecording(amina.id, 'towns-near-rivers')).toBeDefined();
    expect(await store.getCurrentLearnerId()).toBe(amina.id);
  });

  it('does nothing for an unknown id', async () => {
    const amina = await store.addLearner({ name: 'Amina', colour: 'lavender' });
    await store.removeLearner('nobody');
    expect(await store.listLearners()).toEqual([amina]);
  });
});

describe('progress', () => {
  it('starts from an empty record and saves the update', async () => {
    setTime('2026-05-01T09:00:00.000Z');
    expect(await store.getProgress('l1', 'towns-near-rivers')).toBeUndefined();

    const saved = await store.updateProgress('l1', 'towns-near-rivers', (p) => ({ ...p, warmUpAnswer: 'Water' }));
    expect(saved).toEqual({
      ...emptyProgress('l1', 'towns-near-rivers'),
      warmUpAnswer: 'Water',
    });
    expect(saved.startedAt).toBe('2026-05-01T09:00:00.000Z');
    expect(await store.getProgress('l1', 'towns-near-rivers')).toEqual(saved);
  });

  it('merges later updates, keeps startedAt and always moves updatedAt', async () => {
    setTime('2026-05-01T09:00:00.000Z');
    await store.updateProgress('l1', 'towns-near-rivers', (p) => ({ ...p, warmUpAnswer: 'Water' }));
    setTime('2026-05-01T09:05:00.000Z');
    const saved = await store.updateProgress('l1', 'towns-near-rivers', (p) => ({
      ...p,
      writing: { ...p.writing, text: 'Rivers give water.' },
      checkAnswers: { 0: { type: 'choice', selected: 2, correct: true, tries: 1 } },
      reflections: { 0: 'I learned why towns grow.' },
      // The update can't move the record or fake the time.
      learnerId: 'someone-else',
      lessonId: 'another-lesson',
      updatedAt: '1999-01-01T00:00:00.000Z',
    }));

    expect(saved.warmUpAnswer).toBe('Water');
    expect(saved.writing.text).toBe('Rivers give water.');
    expect(saved.checkAnswers[0]).toEqual({ type: 'choice', selected: 2, correct: true, tries: 1 });
    expect(saved.reflections[0]).toBe('I learned why towns grow.');
    expect(saved.learnerId).toBe('l1');
    expect(saved.lessonId).toBe('towns-near-rivers');
    expect(saved.startedAt).toBe('2026-05-01T09:00:00.000Z');
    expect(saved.updatedAt).toBe('2026-05-01T09:05:00.000Z');
    expect(await store.getProgress('someone-else', 'another-lesson')).toBeUndefined();
    expect(await store.getProgress('l1', 'towns-near-rivers')).toEqual(saved);
  });

  it('saves nothing when the update throws', async () => {
    await expect(
      store.updateProgress('l1', 'towns-near-rivers', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await store.getProgress('l1', 'towns-near-rivers')).toBeUndefined();
  });

  it('marks a stage done once, in the order stages were finished', async () => {
    await store.markStageDone('l1', 'towns-near-rivers', 'write');
    await store.markStageDone('l1', 'towns-near-rivers', 'read');
    const saved = await store.markStageDone('l1', 'towns-near-rivers', 'write');
    expect(saved.stagesDone).toEqual(['write', 'read']);
  });

  it('sets the current stage', async () => {
    const saved = await store.setCurrentStage('l1', 'towns-near-rivers', 'speak');
    expect(saved.currentStage).toBe('speak');
    expect(saved.stagesDone).toEqual([]);
    expect((await store.setCurrentStage('l1', 'towns-near-rivers', 'watch')).currentStage).toBe('watch');
  });

  it('lists one learner’s progress only', async () => {
    await store.markStageDone('l1', 'a', 'read');
    await store.markStageDone('l1', 'b', 'read');
    await store.markStageDone('l2', 'a', 'read');
    const lessons = (await store.listProgress('l1')).map((p) => p.lessonId).sort();
    expect(lessons).toEqual(['a', 'b']);
    expect(await store.listProgress('nobody')).toEqual([]);
  });

  it('finds the most recently updated lesson for a learner', async () => {
    expect(await store.getLatestProgress('l1')).toBeUndefined();

    setTime('2026-05-01T09:00:00.000Z');
    await store.markStageDone('l1', 'a', 'read');
    setTime('2026-05-01T11:00:00.000Z');
    await store.markStageDone('l1', 'b', 'read');
    setTime('2026-05-01T10:00:00.000Z');
    await store.markStageDone('l1', 'c', 'read');
    // Another learner's newer work doesn't count.
    setTime('2026-05-02T00:00:00.000Z');
    await store.markStageDone('l2', 'z', 'read');

    expect((await store.getLatestProgress('l1'))?.lessonId).toBe('b');

    setTime('2026-05-01T12:00:00.000Z');
    await store.setCurrentStage('l1', 'a', 'write');
    expect((await store.getLatestProgress('l1'))?.lessonId).toBe('a');
    expect((await store.getLatestProgress('l2'))?.lessonId).toBe('z');
  });
});

describe('section checks', () => {
  it('records the first attempt as best and latest', async () => {
    const first = attempt(5, '2026-01-01T00:00:00.000Z');
    const record = await store.recordQuizAttempt('l1', 'history', first);
    expect(record).toEqual({ learnerId: 'l1', sectionId: 'history', best: first, latest: first, attempts: 1 });
    expect(await store.getQuizRecord('l1', 'history')).toEqual(record);
  });

  it('keeps the higher score as best and the newest as latest', async () => {
    const good = attempt(7, '2026-01-01T00:00:00.000Z');
    const worse = attempt(4, '2026-01-02T00:00:00.000Z');
    await store.recordQuizAttempt('l1', 'history', good);
    const record = await store.recordQuizAttempt('l1', 'history', worse);
    expect(record.best).toEqual(good);
    expect(record.latest).toEqual(worse);
    expect(record.attempts).toBe(2);

    const better = attempt(8, '2026-01-03T00:00:00.000Z');
    const third = await store.recordQuizAttempt('l1', 'history', better);
    expect(third.best).toEqual(better);
    expect(third.latest).toEqual(better);
    expect(third.attempts).toBe(3);
  });

  it('makes the newer attempt best on a tie', async () => {
    const older = attempt(6, '2026-01-01T00:00:00.000Z');
    const newer = attempt(6, '2026-01-02T00:00:00.000Z');
    await store.recordQuizAttempt('l1', 'civics', older);
    const record = await store.recordQuizAttempt('l1', 'civics', newer);
    expect(record.best).toEqual(newer);
  });

  it('lists one learner’s records only', async () => {
    await store.recordQuizAttempt('l1', 'history', attempt(1, '2026-01-01T00:00:00.000Z'));
    await store.recordQuizAttempt('l1', 'culture', attempt(2, '2026-01-01T00:00:00.000Z'));
    await store.recordQuizAttempt('l2', 'history', attempt(3, '2026-01-01T00:00:00.000Z'));
    const sections = (await store.listQuizRecords('l1')).map((r) => r.sectionId).sort();
    expect(sections).toEqual(['culture', 'history']);
    expect(await store.getQuizRecord('l2', 'culture')).toBeUndefined();
  });
});

describe('recordings', () => {
  it('saves a clip and reads the same audio back', async () => {
    setTime('2026-05-01T09:00:00.000Z');
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm;codecs=opus' });
    const saved = await store.saveRecording('l1', 'towns-near-rivers', blob, 4200);
    expect(saved).toMatchObject({
      learnerId: 'l1',
      lessonId: 'towns-near-rivers',
      mimeType: 'audio/webm;codecs=opus',
      durationMs: 4200,
      createdAt: '2026-05-01T09:00:00.000Z',
    });

    const read = await store.getRecording('l1', 'towns-near-rivers');
    expect(read).toBeDefined();
    expect(read?.mimeType).toBe('audio/webm;codecs=opus');
    expect(read?.blob.size).toBe(4);
    expect(read?.blob.type).toBe('audio/webm;codecs=opus');
    const bytes = new Uint8Array(await read!.blob.arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3, 4]);
  });

  it('keeps only the latest clip per lesson', async () => {
    await store.saveRecording('l1', 'a', new Blob(['first'], { type: 'audio/webm' }), 1000);
    await store.saveRecording('l1', 'a', new Blob(['second clip'], { type: 'audio/mp4' }), 2000);
    await store.saveRecording('l1', 'b', new Blob(['other'], { type: 'audio/webm' }), 500);

    const a = await store.getRecording('l1', 'a');
    expect(a?.durationMs).toBe(2000);
    expect(a?.mimeType).toBe('audio/mp4');
    expect(await a!.blob.text()).toBe('second clip');
    expect((await store.getRecording('l1', 'b'))?.durationMs).toBe(500);
  });

  it('deletes a clip', async () => {
    await store.saveRecording('l1', 'a', new Blob(['x'], { type: 'audio/webm' }), 1000);
    await store.deleteRecording('l1', 'a');
    expect(await store.getRecording('l1', 'a')).toBeUndefined();
    // Deleting again is harmless.
    await store.deleteRecording('l1', 'a');
  });
});

describe('settings', () => {
  it('returns the defaults when nothing is stored', async () => {
    const settings = await store.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    // A copy, so changing it can't change the defaults.
    settings.partner.allowOnlineDictation = true;
    expect(DEFAULT_SETTINGS.partner.allowOnlineDictation).toBe(false);
  });

  it('merges updates, including partner options key by key', async () => {
    await store.updateSettings({ saveData: true, listeningSpeed: 'slow' });
    const next = await store.updateSettings({ partner: { allowOnlineDictation: true } });
    expect(next).toEqual({
      ...DEFAULT_SETTINGS,
      saveData: true,
      listeningSpeed: 'slow',
      partner: { allowOnlineDictation: true },
    });
    expect(await store.getSettings()).toEqual(next);

    const again = await store.updateSettings({ preferredReadingLevel: 'simpler' });
    expect(again.partner.allowOnlineDictation).toBe(true);
    expect(again.saveData).toBe(true);
  });

  it('fills in defaults for settings added after the record was saved', async () => {
    // A record saved by an older version, without some of today's settings.
    const db = await openThinkerwellDb(name);
    await db.put('settings', { saveData: true, partner: {} } as never, 'device');
    db.close();

    expect(await store.getSettings()).toEqual({ ...DEFAULT_SETTINGS, saveData: true });
  });
});

describe('current learner', () => {
  it('is null until set, then remembers the learner', async () => {
    expect(await store.getCurrentLearnerId()).toBeNull();
    const learner = await store.addLearner({ name: 'Amina', colour: 'lavender' });
    await store.setCurrentLearnerId(learner.id);
    expect(await store.getCurrentLearnerId()).toBe(learner.id);
    await store.setCurrentLearnerId(null);
    expect(await store.getCurrentLearnerId()).toBeNull();
  });

  it('refuses a learner who does not exist', async () => {
    await expect(store.setCurrentLearnerId('nobody')).rejects.toThrow(/No learner/);
    expect(await store.getCurrentLearnerId()).toBeNull();
  });

  it('is null when the stored learner is gone', async () => {
    const db = await openThinkerwellDb(name);
    await db.put('device', 'deleted-learner', 'currentLearnerId');
    db.close();
    expect(await store.getCurrentLearnerId()).toBeNull();
  });
});

describe('app-wide store', () => {
  afterEach(async () => {
    await deleteAllData();
  });

  it('opens once and reuses the same store', async () => {
    const a = getStore();
    const b = getStore();
    expect(a).toBe(b);
    expect(await isStorageAvailable()).toBe(true);
  });

  it('deleteAllData removes everything and the next getStore starts empty', async () => {
    const first = await getStore();
    const learner = await first.addLearner({ name: 'Amina', colour: 'lavender' });
    await first.updateSettings({ saveData: true });

    await deleteAllData();

    const databases = await indexedDB.databases();
    expect(databases.map((d) => d.name)).not.toContain(DB_NAME);

    const second = await getStore();
    expect(second).not.toBe(first);
    expect(await second.getLearner(learner.id)).toBeUndefined();
    expect(await second.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('tries again after a failed open', async () => {
    const original = indexedDB.open.bind(indexedDB);
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('IndexedDB is blocked here');
    });
    expect(await isStorageAvailable()).toBe(false);
    openSpy.mockImplementation(original);
    expect(await isStorageAvailable()).toBe(true);
  });

  it('reports storage as unavailable when there is no IndexedDB', async () => {
    vi.stubGlobal('indexedDB', undefined);
    try {
      expect(await isStorageAvailable()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
