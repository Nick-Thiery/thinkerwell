import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAllData, getStore } from '../storage';
import { joinClass, leaveClass } from './links';
import { checkSyncRequest, type SyncRequest } from './protocol';
import { syncClasses } from './runner';

const FOUND = {
  code: 'K7M-Q4P',
  className: 'Morning group',
  orgName: 'HELP for Refugees',
};
const NOW = () => new Date(Date.now() + 1000);

let sent: SyncRequest[];
let answer: (request: SyncRequest) => Record<string, string>;

beforeEach(() => {
  sent = [];
  answer = (request) => Object.fromEntries(request.learners.map((l) => [l.id, 'saved']));
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as SyncRequest;
      sent.push(body);
      return Promise.resolve(
        new Response(JSON.stringify({ results: answer(body) }), {
          status: 200,
        }),
      );
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await deleteAllData();
});

async function learnerWithWork() {
  const store = await getStore();
  const learner = await store.addLearner({
    name: 'Amira',
    colour: 'lemon',
    language: 'id',
  });
  await store.updateProgress(learner.id, 'towns-near-rivers', (p) => ({
    ...p,
    stagesDone: ['read', 'write'],
    currentStage: 'speak',
    writing: { ...p.writing, text: 'My secret answer about rivers' },
    reflections: { 0: 'A private reflection' },
  }));
  await store.updateProgress(learner.id, 'dw-what-ai-is', (p) => ({
    ...p,
    stagesDone: ['read'],
    currentStage: 'write',
  }));
  await store.recordQuizAttempt(learner.id, 'history', {
    answers: { q1: 2 },
    score: 7,
    total: 10,
    finishedAt: '2026-11-18T03:30:00.000Z',
  });
  return { store, learner };
}

describe('online class sync', () => {
  it('sends nothing on a device where no one joined a class', async () => {
    await learnerWithWork();
    expect(await syncClasses({ now: NOW })).toBe('nothing');
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a joined learner's steps and times, never their writing, answers, scores or recordings", async () => {
    const { store, learner } = await learnerWithWork();
    await joinClass(store, learner.id, FOUND);
    expect((await store.getLearner(learner.id))?.classCode).toBe('K7M-Q4P');
    expect(await syncClasses({ now: NOW })).toBe('sent');
    expect(sent).toHaveLength(1);
    const body = sent[0]!;
    // The server's own checker takes it as it is.
    expect(checkSyncRequest(body)).not.toBeNull();
    const text = JSON.stringify(body);
    expect(text).not.toContain('secret answer');
    expect(text).not.toContain('private reflection');
    expect(text).not.toContain('"score"');
    expect(text).not.toContain(learner.id);
    const mine = body.learners[0]!;
    expect(mine).toMatchObject({
      classCode: 'K7M-Q4P',
      nickname: 'Amira',
      language: 'id',
    });
    expect(mine.progress.find((p) => p.lessonId === 'towns-near-rivers')).toMatchObject({
      courseId: 'our-world',
      stagesDone: ['read', 'write'],
      currentStage: 'speak',
    });
    expect(mine.progress.find((p) => p.lessonId === 'dw-what-ai-is')?.courseId).toBe('digital-world');
    expect(mine.checks).toEqual([{ sectionId: 'history', attempts: 1, lastAt: '2026-11-18T03:30:00.000Z' }]);
    expect(mine.days.length).toBeGreaterThan(0);
  });

  it('sends nothing again until something changes', async () => {
    const { store, learner } = await learnerWithWork();
    await joinClass(store, learner.id, FOUND);
    await syncClasses({ now: NOW });
    expect(await syncClasses({ now: NOW })).toBe('nothing');
    await store.markStageDone(learner.id, 'towns-near-rivers', 'speak');
    expect(await syncClasses({ now: NOW })).toBe('sent');
    expect(sent).toHaveLength(2);
  });

  it('keeps what it had when the send fails, and tries again next time', async () => {
    const { store, learner } = await learnerWithWork();
    await joinClass(store, learner.id, FOUND);
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
    expect(await syncClasses({ now: NOW })).toBe('failed');
    expect((await store.getSettings()).classLinks?.[learner.id]?.lastSentAt).toBeUndefined();
    expect(await syncClasses({ now: NOW })).toBe('sent');
  });

  it('stops sharing when the teacher took the learner out of the class', async () => {
    const { store, learner } = await learnerWithWork();
    await joinClass(store, learner.id, FOUND);
    answer = (request) => Object.fromEntries(request.learners.map((l) => [l.id, 'removed']));
    await syncClasses({ now: NOW });
    expect((await store.getSettings()).classLinks?.[learner.id]?.ended).toBe('removed');
    expect(await syncClasses({ now: NOW })).toBe('nothing');
  });

  it('tells the server to forget a learner who stops sharing, or is removed from the device', async () => {
    const { store, learner } = await learnerWithWork();
    const link = await joinClass(store, learner.id, FOUND);
    await syncClasses({ now: NOW });
    await leaveClass(store, learner.id);
    expect(await syncClasses({ now: NOW })).toBe('sent');
    expect(sent.at(-1)).toMatchObject({
      learners: [],
      removals: [{ id: link.id, secret: link.secret }],
    });
    expect((await store.getSettings()).classRemovals).toEqual([]);

    const other = await store.addLearner({ name: 'Budi', colour: 'paper' });
    const otherLink = await joinClass(store, other.id, FOUND);
    await syncClasses({ now: NOW });
    await store.removeLearner(other.id);
    await syncClasses({ now: NOW });
    expect(sent.at(-1)!.removals).toEqual([{ id: otherLink.id, secret: otherLink.secret }]);
    expect((await store.getSettings()).classLinks?.[other.id]).toBeUndefined();
  });

  it('joins again under a new id when the old one belongs to someone else', async () => {
    const { store, learner } = await learnerWithWork();
    const link = await joinClass(store, learner.id, FOUND);
    answer = (request) => Object.fromEntries(request.learners.map((l) => [l.id, 'forbidden']));
    await syncClasses({ now: NOW });
    const after = (await store.getSettings()).classLinks?.[learner.id];
    expect(after?.id).not.toBe(link.id);
    expect(after?.ended).toBeUndefined();
  });
});
