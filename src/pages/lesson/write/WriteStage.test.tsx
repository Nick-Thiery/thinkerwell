import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLesson, getLessons, type Lesson } from '../../../content';
import { clearGuestMemory, SAVE_DEBOUNCE_MS, LessonPlayerProvider } from '../../../lesson';
import { LearnerSessionProvider } from '../../../session';
import { deleteAllData, getStore, type LessonProgress } from '../../../storage';
import { WriteStage } from './WriteStage';

const lesson = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  clearGuestMemory();
  await deleteAllData();
});

async function addCurrentLearner(): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

function renderWrite(target: Lesson = lesson) {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${target.id}/write`]}>
      <LearnerSessionProvider>
        <LessonPlayerProvider lesson={target} step="write">
          <Routes>
            <Route path="/lesson/:id/write" element={<WriteStage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

async function answerBox(): Promise<HTMLTextAreaElement> {
  return screen.findByLabelText<HTMLTextAreaElement>('Your answer');
}

async function saved(learnerId: string, target: Lesson = lesson): Promise<LessonProgress | undefined> {
  const store = await getStore();
  return store.getProgress(learnerId, target.id);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('WriteStage', () => {
  it('shows the task, the three help modes and the sentence starters by default', async () => {
    renderWrite();
    await answerBox();
    expect(screen.getByText(lesson.write.prompt)).toBeInTheDocument();
    const modes = screen.getByRole('group', { name: 'Writing help' });
    expect(within(modes).getByRole('button', { name: 'Sentence starters' })).toHaveAttribute('aria-pressed', 'true');
    for (const starter of lesson.write.sentenceStarters) {
      expect(screen.getByRole('button', { name: starter })).toBeInTheDocument();
    }
    expect(screen.getByText('Stuck? Tap a sentence starter, then fill in the blanks.')).toBeInTheDocument();
  });

  it('adds a starter at the caret and keeps focus in the writing box', async () => {
    const user = userEvent.setup();
    renderWrite();
    const box = await answerBox();
    await user.click(box);
    await user.type(box, 'First.Last.');
    box.setSelectionRange(6, 6);
    fireEvent.select(box);
    fireEvent.blur(box);

    await user.click(screen.getByRole('button', { name: 'One reason is...' }));
    expect(box.value).toBe('First. One reason is Last.');
    expect(document.activeElement).toBe(box);
    expect(box.selectionStart).toBe('First. One reason is '.length);
    expect(box.selectionEnd).toBe('First. One reason is '.length);
  });

  it('adds a starter at the end of a box that was never focused, selecting its blank', async () => {
    const user = userEvent.setup();
    renderWrite();
    const box = await answerBox();
    const starter = 'I would build the new town at the ___ site.';
    await user.click(screen.getByRole('button', { name: starter }));
    expect(box.value).toBe(starter);
    expect(document.activeElement).toBe(box);
    expect(box.value.slice(box.selectionStart, box.selectionEnd)).toBe('___');
  });

  it('keeps the example hidden until something is written, then offers it closed', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderWrite();
    const box = await answerBox();
    expect(screen.queryByText(lesson.write.example)).toBeNull();
    expect(screen.getByRole('button', { name: 'See an example answer' })).toBeInTheDocument();

    await user.type(box, 'Near the river.');
    expect(screen.queryByRole('button', { name: 'See an example answer' })).toBeNull();
    const details = screen.getByText('Compare with an example answer').closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);

    await user.click(screen.getByText('Compare with an example answer'));
    await waitFor(() => expect(details.open).toBe(true));
    expect(screen.getByText(lesson.write.example)).toBeVisible();
    await waitFor(async () => expect((await saved(learnerId))?.writing.exampleShown).toBe(true));
  });

  it('shows the example when asked before writing, and remembers it', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const view = renderWrite();
    await answerBox();
    await user.click(screen.getByRole('button', { name: 'See an example answer' }));
    expect(screen.getByText(lesson.write.example)).toBeVisible();
    await waitFor(async () => expect((await saved(learnerId))?.writing.exampleShown).toBe(true));
    view.unmount();

    renderWrite();
    await answerBox();
    await waitFor(() => expect(screen.getByText(lesson.write.example)).toBeVisible());
    const details = screen.getByText(lesson.write.example).closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(true);
  });

  it('saves self-check ticks at once', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderWrite();
    await answerBox();
    const tick = screen.getByRole('checkbox', { name: lesson.write.selfCheck[1] });
    await user.click(tick);
    expect(tick).toBeChecked();
    await waitFor(async () => expect((await saved(learnerId))?.writing.selfCheck).toEqual({ 1: true }));
    await user.click(tick);
    await waitFor(async () => expect((await saved(learnerId))?.writing.selfCheck).toEqual({ 1: false }));
  });

  it('saves the planning boxes', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderWrite();
    await answerBox();
    await user.click(screen.getByRole('button', { name: 'Plan first' }));
    expect(screen.queryByRole('button', { name: lesson.write.sentenceStarters[0] })).toBeNull();
    const second = screen.getByLabelText(new RegExp(`^${lesson.write.planningBoxes[1]}`));
    await user.type(second, 'The map');
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    await waitFor(async () => expect((await saved(learnerId))?.writing.planning).toEqual({ 1: 'The map' }));
  });

  it('shows only the writing box in Write mode', async () => {
    const user = userEvent.setup();
    renderWrite();
    await answerBox();
    await user.click(screen.getByRole('button', { name: 'Write' }));
    expect(screen.queryByRole('button', { name: lesson.write.sentenceStarters[0] })).toBeNull();
    expect(screen.queryByLabelText(new RegExp(`^${lesson.write.planningBoxes[0]}`))).toBeNull();
    expect(screen.getByLabelText('Your answer')).toBeInTheDocument();
  });

  it('marks Write done when continuing with writing', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderWrite();
    const box = await answerBox();
    await user.type(box, 'I would build it by the river.');
    await user.click(screen.getByRole('button', { name: 'Continue to Speak' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`/lesson/${lesson.id}/speak`));
    await waitFor(async () => expect((await saved(learnerId))?.stagesDone).toEqual(['write']));
    expect((await saved(learnerId))?.writing.text).toBe('I would build it by the river.');
  });

  it('moves on without a tick when the box is empty', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderWrite();
    const box = await answerBox();
    await user.type(box, '   ');
    const next = screen.getByRole('button', { name: 'Continue to Speak' });
    expect(next).toBeEnabled();
    await user.click(next);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(`/lesson/${lesson.id}/speak`));
    await waitFor(async () => expect((await saved(learnerId))?.currentStage).toBe('write'));
    expect((await saved(learnerId))?.stagesDone).toEqual([]);
  });

  it('restores saved writing, planning and ticks', async () => {
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, lesson.id, (p) => ({
      ...p,
      writing: { text: 'Saved before', planning: { 0: 'Big idea' }, selfCheck: { 2: true }, exampleShown: false },
    }));
    const user = userEvent.setup();
    renderWrite();
    await waitFor(async () => expect((await answerBox()).value).toBe('Saved before'));
    expect(screen.getByRole('checkbox', { name: lesson.write.selfCheck[2] })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: lesson.write.selfCheck[0] })).not.toBeChecked();
    expect(screen.getByText('Compare with an example answer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Plan first' }));
    expect(screen.getByLabelText(new RegExp(`^${lesson.write.planningBoxes[0]}`))).toHaveValue('Big idea');
    expect(screen.getByText(/Saved on this device as you type\./)).toBeInTheDocument();
  });

  it('toggles the evidence inline, with the lesson picture', async () => {
    const user = userEvent.setup();
    renderWrite();
    await answerBox();
    const toggle = screen.getByRole('button', { name: 'Look at the map again' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('img', { name: lesson.visual!.alt })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(panel).toBeInTheDocument();
    // "Look at the map again" shows the map itself, not only its key.
    expect(within(panel!).getByRole('img', { name: lesson.visual!.alt })).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('saves nothing for a visitor who has not chosen a learner', async () => {
    const user = userEvent.setup();
    renderWrite();
    const box = await answerBox();
    expect(screen.getByText(/Nothing is saved until you choose who's learning\./)).toBeInTheDocument();
    await user.type(box, 'Hello');
    await user.click(screen.getByRole('checkbox', { name: lesson.write.selfCheck[0] }));
    await act(() => sleep(SAVE_DEBOUNCE_MS + 150));
    const store = await getStore();
    expect(await store.listLearners()).toEqual([]);
    expect(await store.getProgress('guest', lesson.id)).toBeUndefined();
  });

  it('renders every lesson without console errors', async () => {
    const errors = vi.spyOn(console, 'error');
    const warnings = vi.spyOn(console, 'warn');
    for (const each of getLessons()) {
      const view = renderWrite(each);
      await answerBox();
      expect(screen.getByText(each.write.prompt)).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(each.write.selfCheck.length);
      view.unmount();
    }
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
  }, 60_000);
});
