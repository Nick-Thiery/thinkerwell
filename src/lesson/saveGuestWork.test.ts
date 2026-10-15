import { afterEach, describe, expect, it } from 'vitest';
import { deleteAllData, emptyProgress, getStore } from '../storage';
import {
  claimWorkToSave,
  clearGuestMemory,
  dropWorkToSave,
  guestWork,
  holdWorkToSave,
  peekWorkToSave,
  setGuestProgress,
  takeClaimedWork,
} from './guestMemory';
import { saveGuestWork } from './saveGuestWork';

afterEach(async () => {
  clearGuestMemory();
  dropWorkToSave();
  await deleteAllData();
});

function guestWriting(lessonId: string, text: string) {
  const record = emptyProgress('guest', lessonId);
  return { ...record, stagesDone: ['read' as const], currentStage: 'write' as const, writing: { ...record.writing, text } };
}

describe('"Save my work": a guest\'s work, held for the learner they choose', () => {
  it('holds a copy, which only the learner who claims it gets, once', () => {
    setGuestProgress(guestWriting('towns-near-rivers', 'By the river.'));
    holdWorkToSave(guestWork(), '/lesson/towns-near-rivers/write', 10);
    // Going back to the picker or someone looking around forgets the guest's memory, but not what is held.
    clearGuestMemory();
    expect(peekWorkToSave()?.lessonNumber).toBe(10);
    expect(takeClaimedWork('amina')).toBeNull();

    expect(claimWorkToSave('amina')).toBe('/lesson/towns-near-rivers/write');
    expect(peekWorkToSave()).toBeNull();
    expect(claimWorkToSave('reza')).toBeNull();
    expect(takeClaimedWork('reza')).toBeNull();
    expect(takeClaimedWork('amina')?.map((record) => record.writing.text)).toEqual(['By the river.']);
    expect(takeClaimedWork('amina')).toBeNull();
  });

  it('holds nothing when the guest did nothing, and "Don\'t keep it" drops it', () => {
    holdWorkToSave(guestWork(), '/lesson/towns-near-rivers/read', 10);
    expect(peekWorkToSave()).toBeNull();
    setGuestProgress(guestWriting('towns-near-rivers', 'By the river.'));
    holdWorkToSave(guestWork(), '/lesson/towns-near-rivers/write', 10);
    dropWorkToSave();
    expect(claimWorkToSave('amina')).toBeNull();
  });

  it("saves it to the learner, and combines it with work they already have, losing nothing", async () => {
    const store = await getStore();
    const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.updateProgress(learner.id, 'towns-near-rivers', (p) => ({ ...p, stagesDone: ['speak'], reflections: { 0: 'Water.' } }));

    await saveGuestWork(store, learner.id, [guestWriting('towns-near-rivers', 'By the river.'), guestWriting('finding-out-about-the-past', 'A receipt.')]);

    const rivers = await store.getProgress(learner.id, 'towns-near-rivers');
    expect(rivers?.learnerId).toBe(learner.id);
    expect(rivers?.writing.text).toBe('By the river.');
    expect(rivers?.reflections[0]).toBe('Water.');
    expect(rivers?.stagesDone.slice().sort()).toEqual(['read', 'speak']);
    const past = await store.getProgress(learner.id, 'finding-out-about-the-past');
    expect(past?.writing.text).toBe('A receipt.');
    expect(await store.getProgress('guest', 'towns-near-rivers')).toBeUndefined();
  });
});
