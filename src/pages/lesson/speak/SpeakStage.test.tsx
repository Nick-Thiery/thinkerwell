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
  it('shows both tasks from the lesson and Continue, and asks nothing about how the learner practised', async () => {
    renderSpeak();
    expect(await screen.findByRole('heading', { level: 3, name: 'With a partner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'On your own' })).toBeInTheDocument();
    expect(screen.getByText(lesson.speak.partnerTask)).toBeInTheDocument();
    expect(screen.getByText(lesson.speak.independentTask)).toBeInTheDocument();
    // "How did you practise?" was taken out (docs/notes/simpler-lessons.md): every way counts.
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    for (const option of getCourse().practiceOptions) expect(screen.queryByText(option)).not.toBeInTheDocument();
    // No recorder where the browser can't record (jsdom has no MediaRecorder), and Next is never disabled.
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Watch' })).toBeEnabled();
  });

  it('marks Speak done when the learner continues', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderSpeak();
    await user.click(await screen.findByRole('button', { name: 'Continue to Watch' }));

    const store = await getStore();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.stagesDone).toContain('speak');
      expect(saved?.speak.practisedHow).toBeNull();
    });
  });

  it('keeps a choice saved before the question was taken out', async () => {
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, lesson.id, (p) => ({ ...p, speak: { practisedHow: 1 } }));
    renderSpeak();
    expect(await screen.findByText(lesson.speak.partnerTask)).toBeInTheDocument();
    expect((await store.getProgress(learnerId, lesson.id))?.speak.practisedHow).toBe(1);
  });

  it('saves nothing for someone looking around', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    renderSpeak(lesson, { lookAround: true });
    await user.click(await screen.findByRole('button', { name: 'Continue to Watch' }));
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
