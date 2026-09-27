import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLesson, type Lesson, type LessonStep } from '../content';
import { LearnerSessionProvider, useLearnerSession } from '../session';
import { deleteAllData, getStore } from '../storage';
import { listUnsavedProgress, recoverUnsavedProgress } from '../storage/unsavedProgress';
import { getGuestProgress } from './guestMemory';
import { LessonPlayerProvider, SAVE_DEBOUNCE_MS, useLessonPlayer } from './LessonPlayerContext';

const lesson = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  await deleteAllData();
});

async function addCurrentLearner(): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

function Probe() {
  const player = useLessonPlayer();
  const session = useLearnerSession();
  return (
    <div>
      <p data-testid="status">{player.status}</p>
      <p data-testid="mode">{player.mode}</p>
      <p data-testid="text">{player.progress.writing.text}</p>
      <p data-testid="done">{player.progress.stagesDone.join(',')}</p>
      <p data-testid="level">{player.readingLevel}</p>
      <button onClick={() => player.update((p) => ({ ...p, writing: { ...p.writing, text: `${p.writing.text}a` } }))}>
        Type
      </button>
      <button onClick={() => player.update((p) => ({ ...p, warmUpAnswer: 'Near the river' }), { immediate: true })}>
        Warm up
      </button>
      <button onClick={() => player.stageEvent({ stage: 'read', kind: 'continue' })}>Read done</button>
      <button onClick={() => player.setReadingLevel('simpler')}>Simpler</button>
      <button onClick={() => session.startLookAround()}>Look around</button>
    </div>
  );
}

function renderPlayer(step: LessonStep = 'write') {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${lesson.id}/${step}`]}>
      <LearnerSessionProvider>
        <LessonPlayerProvider lesson={lesson} step={step}>
          <Probe />
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('LessonPlayerProvider (learner)', () => {
  it('waits for the typing pause before saving, then saves with the current stage', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('mode')).toHaveTextContent('learner');

    const typedAt = Date.now();
    await user.click(screen.getByText('Type'));
    await user.click(screen.getByText('Type'));
    expect(screen.getByTestId('text')).toHaveTextContent('aa');
    const store = await getStore();
    const beforeThePause = await store.getProgress(learnerId, lesson.id);
    // Nothing is saved before the typing pause. Checked only when this test
    // got here within the pause: on a busy machine (a type check or other
    // test files running alongside) the two clicks alone can take longer,
    // and the save then rightly lands first. That made this test fail now
    // and then.
    if (Date.now() - typedAt < SAVE_DEBOUNCE_MS) expect(beforeThePause).toBeUndefined();

    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('aa'));
    expect((await store.getProgress(learnerId, lesson.id))?.currentStage).toBe('write');
  });

  it('saves at once when asked, and stage events mark stages done', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderPlayer('read');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    const store = await getStore();

    await user.click(screen.getByText('Warm up'));
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.warmUpAnswer).toBe('Near the river'));

    await user.click(screen.getByText('Read done'));
    expect(screen.getByTestId('done')).toHaveTextContent('read');
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.stagesDone).toEqual(['read']));
  });

  it('restores saved progress when the lesson opens again', async () => {
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, lesson.id, (p) => ({ ...p, writing: { ...p.writing, text: 'Saved before' } }));
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('text')).toHaveTextContent('Saved before'));
  });

  it('flushes unsaved typing when the player unmounts (route change)', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const view = renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await user.click(screen.getByText('Type'));
    view.unmount();
    const store = await getStore();
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('a'));
  });

  it('on pagehide, writes everything straight away in one request, and the pending save is dropped', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    // Something saved earlier that this visit never touches must survive.
    await store.updateProgress(learnerId, lesson.id, (p) => ({ ...p, warmUpAnswer: 'On the hill' }));
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByText('Type'));
    await user.click(screen.getByText('Type'));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('aa'));
    const saved = await store.getProgress(learnerId, lesson.id);
    expect(saved).toMatchObject({ warmUpAnswer: 'On the hill', currentStage: 'write' });

    // The debounced save was cancelled; typing after it still saves normally.
    await user.click(screen.getByText('Type'));
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('aaa'));
  });

  it('on pagehide, also keeps a copy outside IndexedDB until the write lands', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    const store = await getStore();

    // The page goes away before the put can land: it never settles.
    const put = vi.spyOn(store, 'putProgress').mockImplementation(() => new Promise(() => undefined));
    await user.click(screen.getByText('Type'));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(put).toHaveBeenCalledTimes(1);
    expect(listUnsavedProgress().map((r) => [r.learnerId, r.writing.text])).toEqual([[learnerId, 'a']]);
    expect(await store.getProgress(learnerId, lesson.id)).toBeUndefined();

    // What the next page load does first (getStore): the copy is written back.
    await recoverUnsavedProgress(store);
    expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('a');
    expect(listUnsavedProgress()).toEqual([]);
    put.mockRestore();
  });

  it('removes the kept copy once the last-moment write lands', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    const store = await getStore();
    await user.click(screen.getByText('Type'));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('a'));
    await waitFor(() => expect(listUnsavedProgress()).toEqual([]));
  });

  it('a last-moment save is never overwritten by an older batch still waiting to be written', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    const store = await getStore();

    await user.click(screen.getByText('Type')); // batch 1: queued
    await user.click(screen.getByText('Warm up')); // flushes batch 1 (in flight)
    await user.click(screen.getByText('Type')); // queued
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    const saved = await store.getProgress(learnerId, lesson.id);
    expect(saved?.writing.text).toBe('aa');
    expect(saved?.warmUpAnswer).toBe('Near the river');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('remembers the reading level on the learner', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderPlayer('read');
    await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('standard'));
    await user.click(screen.getByText('Simpler'));
    await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('simpler'));
    const store = await getStore();
    expect((await store.getLearner(learnerId))?.readingLevel).toBe('simpler');
  });

  it('falls back to the device setting for a learner who has not chosen', async () => {
    await addCurrentLearner();
    const store = await getStore();
    await store.updateSettings({ preferredReadingLevel: 'simpler' });
    renderPlayer('read');
    await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('simpler'));
  });
});

describe('LessonPlayerProvider (guests)', () => {
  it('keeps a look-around visitor\'s work in memory and writes nothing', async () => {
    const user = userEvent.setup();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('mode')).toHaveTextContent('no-learner');
    await user.click(screen.getByText('Look around'));
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('look-around'));

    await user.click(screen.getByText('Type'));
    await user.click(screen.getByText('Read done'));
    await user.click(screen.getByText('Simpler'));
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));

    expect(screen.getByTestId('text')).toHaveTextContent('a');
    expect(screen.getByTestId('level')).toHaveTextContent('simpler');
    expect(getGuestProgress(lesson.id).writing.text).toBe('a');
    const store = await getStore();
    expect(await store.listLearners()).toEqual([]);
    expect(await store.getProgress('guest', lesson.id)).toBeUndefined();
    expect(await store.getProgress('look-around', lesson.id)).toBeUndefined();
  });
});

/** The app's shape: one player per lesson, kept mounted while the stage in the URL changes. */
function Moves() {
  const player = useLessonPlayer();
  return (
    <div>
      <p data-testid="step">{player.step}</p>
      <p data-testid="status">{player.status}</p>
      <button
        onClick={() => {
          player.stageEvent({ stage: 'read', kind: 'continue' });
          player.goTo('write');
        }}
      >
        Continue to Write
      </button>
      <button
        onClick={() => {
          player.stageEvent({ stage: 'write', kind: 'continue' });
          player.goTo('speak');
        }}
      >
        Continue to Speak
      </button>
    </div>
  );
}

function StageFromUrl() {
  const { stage } = useParams();
  return (
    <LessonPlayerProvider lesson={lesson} step={stage as LessonStep}>
      <Moves />
    </LessonPlayerProvider>
  );
}

function renderRouted(step: LessonStep) {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${lesson.id}/${step}`]}>
      <LearnerSessionProvider>
        <Routes>
          <Route path="/lesson/:id/:stage" element={<StageFromUrl />} />
        </Routes>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

describe('LessonPlayerProvider (moving between stages)', () => {
  it('saves the next stage as current even when the first save is the Continue itself', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderRouted('read');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByText('Continue to Write'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('write'));
    const store = await getStore();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.stagesDone).toEqual(['read']);
      expect(saved?.currentStage).toBe('write');
    });
  });

  it("never creates a record for a lesson when Continue changes nothing (an empty Write box)", async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderRouted('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByText('Continue to Speak'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('speak'));
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    const store = await getStore();
    expect(await store.getProgress(learnerId, lesson.id)).toBeUndefined();
  });
});
