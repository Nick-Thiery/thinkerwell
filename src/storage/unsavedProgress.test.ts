import { deleteDB } from 'idb';
import { deleteAllData, emptyProgress, getStore, openStore, type ThinkerwellStore } from './index';
import {
  forgetAllUnsavedProgress,
  forgetUnsavedProgress,
  keepUnsavedProgress,
  listUnsavedProgress,
  recoverUnsavedProgress,
} from './unsavedProgress';

const LESSON = 'towns-near-rivers';

let name: string;
let store: ThinkerwellStore;

beforeEach(async () => {
  window.localStorage.clear();
  name = `test-${crypto.randomUUID()}`;
  store = await openStore(name);
});

afterEach(async () => {
  store.close();
  await deleteDB(name);
  window.localStorage.clear();
});

function typed(learnerId: string, text: string, lessonId = LESSON) {
  const record = emptyProgress(learnerId, lessonId);
  return { ...record, writing: { ...record.writing, text } };
}

describe('last-moment copies of lesson work', () => {
  it('keeps a copy, lists it and forgets it', () => {
    expect(keepUnsavedProgress(typed('a', 'Rivers matter.'))).toBe(true);
    expect(listUnsavedProgress().map((r) => r.writing.text)).toEqual(['Rivers matter.']);
    forgetUnsavedProgress('a', LESSON);
    expect(listUnsavedProgress()).toEqual([]);
    expect(window.localStorage.length).toBe(0);
  });

  it('writes a kept copy back over the stored record, then removes it', async () => {
    const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.updateProgress(learner.id, LESSON, (p) => ({ ...p, warmUpAnswer: 'On the hill' }));
    const stored = await store.getProgress(learner.id, LESSON);
    // The page's in-memory record: the stored one plus what was typed last.
    keepUnsavedProgress({ ...stored!, writing: { ...stored!.writing, text: 'Typed just before the reload' } });

    await recoverUnsavedProgress(store);

    const saved = await store.getProgress(learner.id, LESSON);
    expect(saved?.writing.text).toBe('Typed just before the reload');
    expect(saved?.warmUpAnswer).toBe('On the hill');
    expect(saved?.startedAt).toBe(stored?.startedAt);
    expect(window.localStorage.length).toBe(0);
  });

  it('drops copies for learners who no longer exist, and unreadable ones', async () => {
    keepUnsavedProgress(typed('gone', 'Old work'));
    window.localStorage.setItem('thinkerwell:unsaved-progress:x:y', '{not json');
    window.localStorage.setItem('someone-else', 'kept');
    await recoverUnsavedProgress(store);
    expect(await store.getProgress('gone', LESSON)).toBeUndefined();
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.getItem('someone-else')).toBe('kept');
  });

  it('keeps a copy it could not write, for the next try', async () => {
    const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    keepUnsavedProgress(typed(learner.id, 'Keep me'));
    const failing = { ...store, updateProgress: () => Promise.reject(new Error('Storage full')) };
    await recoverUnsavedProgress(failing);
    expect(listUnsavedProgress()).toHaveLength(1);
    await recoverUnsavedProgress(store);
    expect((await store.getProgress(learner.id, LESSON))?.writing.text).toBe('Keep me');
    expect(listUnsavedProgress()).toEqual([]);
  });

  it('forgets one learner’s copies, or everyone’s', () => {
    keepUnsavedProgress(typed('a', 'one'));
    keepUnsavedProgress(typed('a', 'two', 'other-lesson'));
    keepUnsavedProgress(typed('b', 'three'));
    forgetAllUnsavedProgress('a');
    expect(listUnsavedProgress().map((r) => r.learnerId)).toEqual(['b']);
    forgetAllUnsavedProgress();
    expect(listUnsavedProgress()).toEqual([]);
  });

  it('removing a learner removes their copies too', async () => {
    const amina = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    const bilal = await store.addLearner({ name: 'Bilal', colour: 'civics' });
    keepUnsavedProgress(typed(amina.id, 'Amina’s work'));
    keepUnsavedProgress(typed(bilal.id, 'Bilal’s work'));
    await store.removeLearner(amina.id);
    expect(listUnsavedProgress().map((r) => r.learnerId)).toEqual([bilal.id]);
  });
});

describe('the app-wide store', () => {
  afterEach(async () => {
    await deleteAllData();
  });

  it('writes kept copies back before it is handed out', async () => {
    const first = await getStore();
    const learner = await first.addLearner({ name: 'Amina', colour: 'lemon' });
    keepUnsavedProgress(typed(learner.id, 'Typed just before the reload'));

    // A fresh page: a new module instance, so a new app-wide store.
    vi.resetModules();
    const fresh = await import('./store');
    const reopened = await fresh.getStore();
    expect((await reopened.getProgress(learner.id, LESSON))?.writing.text).toBe('Typed just before the reload');
    expect(listUnsavedProgress()).toEqual([]);
    reopened.close();
  });

  it('deleteAllData removes kept copies too', async () => {
    keepUnsavedProgress(typed('a', 'one'));
    await deleteAllData();
    expect(window.localStorage.length).toBe(0);
  });
});
