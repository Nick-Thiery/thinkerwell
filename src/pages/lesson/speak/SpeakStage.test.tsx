import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lessonPath } from '../../../app/lessonUrls';
import { getCourse, getLesson, getLessons, type Lesson } from '../../../content';
import { LessonPlayerProvider, useLessonPlayer } from '../../../lesson';
import { LearnerSessionProvider } from '../../../session';
import { deleteAllData, getStore } from '../../../storage';
import { SpeakStage } from './SpeakStage';

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

/** Renders the stage once the player is ready, as LessonPage does. */
function WhenReady() {
  const { status } = useLessonPlayer();
  return status === 'ready' ? <SpeakStage /> : null;
}

function renderSpeak(target: Lesson = lesson, { lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[lessonPath(target.id, 'speak')]}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <LessonPlayerProvider lesson={target} step="speak">
          <WhenReady />
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

// Generous timeouts: these use real IndexedDB (fake-indexeddb) and run beside the whole suite.
describe('SpeakStage', { timeout: 30_000 }, () => {
  it('shows both tasks from the lesson and a chip for every practice option in course.json', async () => {
    renderSpeak();
    const group = await screen.findByRole('radiogroup', { name: 'How did you practise?' });
    expect(screen.getByRole('heading', { level: 3, name: 'With a partner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'On your own' })).toBeInTheDocument();
    expect(screen.getByText(lesson.speak.partnerTask)).toBeInTheDocument();
    expect(screen.getByText(lesson.speak.independentTask)).toBeInTheDocument();
    const chips = Array.from(group.querySelectorAll('[role="radio"]'));
    expect(chips.map((chip) => chip.textContent)).toEqual(getCourse().practiceOptions);
    expect(chips.every((chip) => chip.getAttribute('aria-checked') === 'false')).toBe(true);
    // No recorder where the browser can't record (jsdom has no MediaRecorder), and Next is never disabled.
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Watch' })).toBeEnabled();
  });

  it('saves the chosen option by its index and marks Speak done', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderSpeak();
    const option = getCourse().practiceOptions[2] as string;
    await user.click(await screen.findByRole('radio', { name: option }));
    expect(screen.getByRole('radio', { name: option })).toHaveAttribute('aria-checked', 'true');

    const store = await getStore();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.speak.practisedHow).toBe(2);
      expect(saved?.stagesDone).toContain('speak');
      expect(saved?.currentStage).toBe('speak');
    });
  });

  it('restores the saved choice', async () => {
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, lesson.id, (p) => ({ ...p, speak: { practisedHow: 1 } }));
    renderSpeak();
    const option = getCourse().practiceOptions[1] as string;
    await waitFor(() => expect(screen.getByRole('radio', { name: option })).toHaveAttribute('aria-checked', 'true'));
  });

  it('keeps a look-around choice in memory only', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderSpeak(lesson, { lookAround: true });
    const option = getCourse().practiceOptions[0] as string;
    await user.click(await screen.findByRole('radio', { name: option }));
    expect(screen.getByRole('radio', { name: option })).toHaveAttribute('aria-checked', 'true');
    const store = await getStore();
    expect(await store.listProgress(learnerId)).toEqual([]);
  });

  it('renders every lesson without console errors', { timeout: 120_000 }, async () => {
    const errors = vi.spyOn(console, 'error');
    for (const each of getLessons()) {
      const { unmount } = renderSpeak(each);
      expect(await screen.findByText(each.speak.partnerTask)).toBeInTheDocument();
      unmount();
    }
    expect(errors).not.toHaveBeenCalled();
  });
});
