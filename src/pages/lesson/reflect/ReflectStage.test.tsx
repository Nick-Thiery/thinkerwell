import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lessonPath } from '../../../app/lessonUrls';
import { getLesson, getLessons, isLessonStep, type Lesson } from '../../../content';
import { LessonPlayerProvider, SAVE_DEBOUNCE_MS, useLessonPlayer } from '../../../lesson';
import { LearnerSessionProvider } from '../../../session';
import { deleteAllData, getStore } from '../../../storage';
import { ReflectStage } from './ReflectStage';

const lesson = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  vi.restoreAllMocks();
  await deleteAllData();
});

async function addCurrentLearner(): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

function WhereAmI() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function Stage() {
  const { status, step } = useLessonPlayer();
  if (status !== 'ready') return null;
  return step === 'reflect' ? <ReflectStage /> : <p>Other step</p>;
}

/** Like LessonRoute: one player per lesson, the step from the URL. */
function Player({ target }: { target: Lesson }) {
  const { step = 'read' } = useParams();
  if (!isLessonStep(step)) return null;
  return (
    <LessonPlayerProvider lesson={target} step={step}>
      <Stage />
    </LessonPlayerProvider>
  );
}

function renderReflect(target: Lesson = lesson) {
  return render(
    <MemoryRouter initialEntries={[lessonPath(target.id, 'reflect')]}>
      <LearnerSessionProvider>
        <Routes>
          <Route path="/lesson/:id/:step" element={<Player target={target} />} />
        </Routes>
        <WhereAmI />
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Generous timeouts: these use real IndexedDB (fake-indexeddb) and run beside the whole suite.
describe('ReflectStage', { timeout: 30_000 }, () => {
  it('shows one box per prompt, the optional one marked, and Finish disabled until the required one has text', async () => {
    const user = userEvent.setup();
    renderReflect();
    const [required, optional] = lesson.reflect.prompts;
    const requiredBox = await screen.findByRole('textbox', { name: required?.text });
    const optionalBox = screen.getByRole('textbox', { name: new RegExp(`^${escape(optional?.text ?? '')}`) });
    expect(requiredBox).toHaveAttribute('rows', '4');
    expect(optionalBox).toHaveAttribute('rows', '3');
    expect(screen.getByText('(optional)', { exact: false })).toBeInTheDocument();

    const finish = screen.getByRole('button', { name: 'Finish lesson' });
    expect(finish).toBeDisabled();
    expect(screen.getByText('Answer the first question to finish.')).toBeInTheDocument();

    // The optional prompt never unlocks or blocks anything.
    await user.type(optionalBox, 'What about floods?');
    expect(finish).toBeDisabled();
    await user.type(requiredBox, '   ');
    expect(finish).toBeDisabled();
    await user.type(requiredBox, 'Water for farms.');
    expect(finish).toBeEnabled();
    expect(screen.queryByText('Answer the first question to finish.')).not.toBeInTheDocument();
  });

  it('saves reflections after the typing pause', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderReflect();
    const box = await screen.findByRole('textbox', { name: lesson.reflect.prompts[0]?.text });
    await user.type(box, 'Rivers');
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    const store = await getStore();
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.reflections[0]).toBe('Rivers'));
  });

  it('answering the required prompt completes the lesson, even if the learner leaves without Finish', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const view = renderReflect();
    const [required, optional] = lesson.reflect.prompts;
    const store = await getStore();

    // The optional prompt alone completes nothing.
    await user.type(
      await screen.findByRole('textbox', { name: new RegExp(`^${escape(optional?.text ?? '')}`) }),
      'Floods?',
    );
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    await waitFor(async () => expect((await store.getProgress(learnerId, lesson.id))?.reflections[1]).toBe('Floods?'));
    expect((await store.getProgress(learnerId, lesson.id))?.completedAt).toBeNull();

    await user.type(screen.getByRole('textbox', { name: required?.text }), 'Water for farms.');
    // Leaving (a route change) before the typing pause still saves it all.
    view.unmount();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.reflections[0]).toBe('Water for farms.');
      expect(saved?.stagesDone).toContain('reflect');
      expect(saved?.completedAt).toEqual(expect.any(String));
    });
  });

  it('finishing completes the lesson and goes to the completion screen', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderReflect();
    await user.type(await screen.findByRole('textbox', { name: lesson.reflect.prompts[0]?.text }), 'Water and trade.');
    await user.click(screen.getByRole('button', { name: 'Finish lesson' }));

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(lessonPath(lesson.id, 'complete')));
    const store = await getStore();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.completedAt).toEqual(expect.any(String));
      expect(saved?.stagesDone).toContain('reflect');
      expect(saved?.reflections[0]).toBe('Water and trade.');
    });
  });

  it('tells a learner where answers go, and a guest that nothing is saved', async () => {
    await addCurrentLearner();
    const { unmount } = renderReflect();
    expect(await screen.findByText(/Your answers go into your journal on this device/)).toBeInTheDocument();
    unmount();
    await deleteAllData();
    renderReflect();
    expect(await screen.findByText(/Your answers aren't saved yet/)).toBeInTheDocument();
  });

  it('renders every lesson without console errors', { timeout: 120_000 }, async () => {
    const errors = vi.spyOn(console, 'error');
    for (const each of getLessons()) {
      const { unmount } = renderReflect(each);
      expect(await screen.findByRole('textbox', { name: each.reflect.prompts[0]?.text })).toBeInTheDocument();
      unmount();
    }
    expect(errors).not.toHaveBeenCalled();
  });
});

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
