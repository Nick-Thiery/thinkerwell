// @vitest-environment node
// Moving work between devices through the store: exportWork on one database,
// the file in between, importWork on another. Node's Blob survives
// fake-indexeddb's structured clone (see storage.test.ts).
import { deleteDB } from 'idb';
import { openStore, type ThinkerwellStore } from './store';
import type { QuizAttempt } from './types';
import { buildWorkFile, checkWorkFile, serialiseWorkFile, type KnownContent, type LearnerWork } from './workFile';

const known: KnownContent = {
  lessonIds: new Set(['finding-out-about-the-past', 'towns-near-rivers', 'changing-scale']),
  sectionIds: new Set(['history', 'geography', 'culture', 'civics']),
};

let names: string[];
let tablet: ThinkerwellStore;
let laptop: ThinkerwellStore;

beforeEach(async () => {
  names = [`test-${crypto.randomUUID()}`, `test-${crypto.randomUUID()}`];
  tablet = await openStore(names[0]);
  laptop = await openStore(names[1]);
});

afterEach(async () => {
  vi.restoreAllMocks();
  tablet.close();
  laptop.close();
  await Promise.all(names.map((name) => deleteDB(name)));
});

function attempt(score: number, finishedAt: string): QuizAttempt {
  return { answers: { 'history-01': 0 }, score, total: 10, finishedAt };
}

/** What a person would do: save to a file on one device and check that file on another. */
async function carry(from: ThinkerwellStore, ids?: string[]): Promise<LearnerWork[]> {
  const text = serialiseWorkFile(buildWorkFile(await from.exportWork(ids)));
  const result = checkWorkFile(text, known);
  if (!result.ok) throw new Error(`the file was refused: ${result.problem}`);
  return result.file.learners;
}

/** Everything a learner has on a device, for comparing. */
async function everything(store: ThinkerwellStore) {
  const learners = await store.listLearners();
  return Promise.all(
    learners.map(async (learner) => ({
      learner,
      progress: await store.listProgress(learner.id),
      quizAttempts: await store.listQuizRecords(learner.id),
    })),
  );
}

async function aminaWithWork(store: ThinkerwellStore) {
  const amina = await store.addLearner({ name: 'Amina', colour: 'geography', classCode: 'HLP-07' });
  await store.updateLearner(amina.id, { readingLevel: 'simpler' });
  await store.updateProgress(amina.id, 'towns-near-rivers', (p) => ({
    ...p,
    stagesDone: ['read', 'write'],
    writing: { ...p.writing, text: 'I would build by the river.' },
    reflections: { 0: 'Rivers give water.' },
  }));
  await store.recordQuizAttempt(amina.id, 'history', attempt(7, '2026-09-03T10:00:00.000Z'));
  await store.saveRecording(amina.id, 'towns-near-rivers', new Blob(['clip'], { type: 'audio/webm' }), 1200);
  return (await store.getLearner(amina.id))!;
}

describe('exportWork', () => {
  it('reads learners with their lessons and section checks, and nothing else', async () => {
    const amina = await aminaWithWork(tablet);
    const yusuf = await tablet.addLearner({ name: 'Yusuf', colour: 'lemon' });
    await tablet.updateSettings({ saveData: true });
    await tablet.setCurrentLearnerId(amina.id);

    const all = await tablet.exportWork();
    expect(all.map((work) => work.learner)).toEqual([amina, yusuf]);
    expect(all[0]!.progress).toEqual(await tablet.listProgress(amina.id));
    expect(all[0]!.quizAttempts).toEqual(await tablet.listQuizRecords(amina.id));
    expect(all[1]).toEqual({ learner: yusuf, progress: [], quizAttempts: [] });
    expect(JSON.stringify(all)).not.toMatch(/audio|blob|saveData|currentLearnerId/);

    expect((await tablet.exportWork([yusuf.id, 'nobody'])).map((work) => work.learner.id)).toEqual([yusuf.id]);
    expect(await tablet.exportWork([])).toEqual([]);
  });
});

describe('importWork', () => {
  it('puts a learner and their work on a new device exactly as they were, without recordings', async () => {
    const amina = await aminaWithWork(tablet);
    const summary = await laptop.importWork(await carry(tablet));
    expect(summary).toEqual({ added: [amina], updated: [], unchanged: [] });
    expect(await everything(laptop)).toEqual(await everything(tablet));
    expect(await laptop.getRecording(amina.id, 'towns-near-rivers')).toBeUndefined();
    // Loading work doesn't choose anyone, or change the device's settings.
    expect(await laptop.getCurrentLearnerId()).toBeNull();
    expect((await laptop.getSettings()).saveData).toBeNull();
  });

  it('combines work for a learner already here, keeping everything from both', async () => {
    const amina = await aminaWithWork(tablet);
    await laptop.importWork(await carry(tablet));
    // Amina carries on on the laptop; meanwhile the tablet still has its copy.
    await laptop.updateProgress(amina.id, 'changing-scale', (p) => ({ ...p, stagesDone: ['read'] }));
    await laptop.updateProgress(amina.id, 'towns-near-rivers', (p) => ({ ...p, reflections: { ...p.reflections, 1: 'And trade.' } }));
    await tablet.updateProgress(amina.id, 'finding-out-about-the-past', (p) => ({ ...p, completedAt: '2026-09-04T10:00:00.000Z', stagesDone: ['reflect'] }));

    const summary = await tablet.importWork(await carry(laptop));
    expect(summary).toEqual({ added: [], updated: [amina], unchanged: [] });
    const lessons = new Map((await tablet.listProgress(amina.id)).map((p) => [p.lessonId, p]));
    expect([...lessons.keys()].sort()).toEqual(['changing-scale', 'finding-out-about-the-past', 'towns-near-rivers']);
    expect(lessons.get('towns-near-rivers')!.reflections).toEqual({ 0: 'Rivers give water.', 1: 'And trade.' });
    expect(lessons.get('finding-out-about-the-past')!.completedAt).toBe('2026-09-04T10:00:00.000Z');
    // The recording stays where it was made.
    expect(await tablet.getRecording(amina.id, 'towns-near-rivers')).toBeDefined();
  });

  it('adds a different learner with the same name as someone here', async () => {
    await aminaWithWork(tablet);
    const laptopAmina = await laptop.addLearner({ name: 'Amina', colour: 'lemon' });
    await laptop.importWork(await carry(tablet));
    const learners = await laptop.listLearners();
    expect(learners.map((l) => l.name)).toEqual(['Amina', 'Amina']);
    expect(learners.map((l) => l.id)).toContain(laptopAmina.id);
    expect(await laptop.listProgress(laptopAmina.id)).toEqual([]);
  });

  it('changes nothing the second time the same file is loaded', async () => {
    const amina = await aminaWithWork(tablet);
    await laptop.addLearner({ name: 'Omar', colour: 'civics' });
    const work = await carry(tablet);
    await laptop.importWork(work);
    const afterFirst = await everything(laptop);

    const put = vi.spyOn(IDBObjectStore.prototype, 'put');
    const add = vi.spyOn(IDBObjectStore.prototype, 'add');
    const summary = await laptop.importWork(work);
    expect(summary).toEqual({ added: [], updated: [], unchanged: [amina] });
    expect(put).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(await everything(laptop)).toEqual(afterFirst);
  });

  it('leaves nothing changed when a write fails part-way', async () => {
    await aminaWithWork(tablet);
    await tablet.addLearner({ name: 'Yusuf', colour: 'lemon' });
    const omar = await laptop.addLearner({ name: 'Omar', colour: 'civics' });
    await laptop.updateProgress(omar.id, 'towns-near-rivers', (p) => ({ ...p, stagesDone: ['read'] }));
    const before = await everything(laptop);
    const work = await carry(tablet);

    // Let the learners in, then fail the first lesson write.
    const proto = IDBObjectStore.prototype;
    const realPut: (this: IDBObjectStore, value: unknown, key?: IDBValidKey) => IDBRequest<IDBValidKey> = Reflect.get(proto, 'put');
    vi.spyOn(proto, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
      if (this.name === 'progress') throw new DOMException('Disk full', 'QuotaExceededError');
      return realPut.call(this, value, key);
    });

    await expect(laptop.importWork(work)).rejects.toThrow('Disk full');
    vi.restoreAllMocks();
    expect(await everything(laptop)).toEqual(before);
  });

  it('leaves nothing changed when the browser refuses the whole transaction', async () => {
    await aminaWithWork(tablet);
    const before = await everything(laptop);
    const work = await carry(tablet);
    // A learner who is somehow already there makes add() fail inside the transaction.
    const proto = IDBObjectStore.prototype;
    const realAdd: (this: IDBObjectStore, value: unknown, key?: IDBValidKey) => IDBRequest<IDBValidKey> = Reflect.get(proto, 'add');
    vi.spyOn(proto, 'add').mockImplementation(function (this: IDBObjectStore, value) {
      const request = realAdd.call(this, value);
      // Adding the same learner twice: the second add fails with a ConstraintError.
      realAdd.call(this, value);
      return request;
    });
    await expect(laptop.importWork(work)).rejects.toThrow();
    vi.restoreAllMocks();
    expect(await everything(laptop)).toEqual(before);
  });
});
