// What the lesson player tells pilot measurement (src/measurement): which lesson and step is open, which
// steps finish, the reading level, and word COUNTS for writing. `track` is mocked, so this is about what is
// reported; src/measurement/*.test.ts is about what happens to it.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLesson, type Lesson, type LessonStep } from '../content';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore } from '../storage';
import { LessonPlayerProvider, useLessonPlayer } from './LessonPlayerContext';

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  leaveLesson: vi.fn(),
  state: { org: null as string | null, gate: null as { org: string; pilotCode: string } | null },
}));
vi.mock('../measurement/track', () => ({
  track: mocks.track,
  leaveLesson: mocks.leaveLesson,
  getMeasurementState: () => mocks.state,
  useMeasurementState: () => mocks.state,
  setMeasurementState: vi.fn(),
  forgetLearner: vi.fn(),
}));

const lesson = getLesson('towns-near-rivers') as Lesson;

beforeEach(() => {
  mocks.track.mockClear();
  mocks.leaveLesson.mockClear();
  mocks.state.org = 'help-jakarta';
  mocks.state.gate = { org: 'help-jakarta', pilotCode: 'HLP-01' };
});
afterEach(async () => {
  await deleteAllData();
});

async function addCurrentLearner(name = 'HLP-01'): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name, colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

function Probe() {
  const player = useLessonPlayer();
  return (
    <div>
      <p data-testid="status">{player.status}</p>
      <button
        onClick={() =>
          player.update((p) => ({ ...p, writing: { ...p.writing, text: 'The river helped people grow food' } }))
        }
      >
        Type
      </button>
      <button onClick={() => player.stageEvent({ stage: 'read', kind: 'continue' })}>Read done</button>
      <button onClick={() => player.setReadingLevel('simpler')}>Simpler</button>
    </div>
  );
}

function renderPlayer(step: LessonStep = 'read') {
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

const tracked = () => mocks.track.mock.calls.map((call: unknown[]) => ({ type: call[0], ...(call[1] as object) }));

describe('the lesson player and pilot measurement', () => {
  it('reports the lesson and step that open, and that the learner left', async () => {
    await addCurrentLearner();
    const view = renderPlayer('read');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(tracked()).toEqual(
      expect.arrayContaining([
        { type: 'lesson_open', lessonId: lesson.id },
        { type: 'stage_enter', lessonId: lesson.id, stage: 'read' },
      ]),
    );
    view.unmount();
    expect(mocks.leaveLesson).toHaveBeenCalled();
  });

  it('reports a finished step once', async () => {
    const user = userEvent.setup();
    await addCurrentLearner();
    renderPlayer('read');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await user.click(screen.getByText('Read done'));
    await user.click(screen.getByText('Read done'));
    const done = tracked().filter((call) => call.type === 'stage_complete');
    expect(done).toEqual([{ type: 'stage_complete', lessonId: lesson.id, stage: 'read' }]);
  });

  it('reports the reading level a learner switches to', async () => {
    const user = userEvent.setup();
    await addCurrentLearner();
    renderPlayer('read');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await user.click(screen.getByText('Simpler'));
    expect(tracked()).toContainEqual({ type: 'simpler_toggle', lessonId: lesson.id, value: { level: 'simpler' } });
  });

  it('reports how many words were written, and never the words', async () => {
    const user = userEvent.setup();
    await addCurrentLearner();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await user.click(screen.getByText('Type'));
    const writing = tracked().filter((call) => call.type === 'writing_saved');
    expect(writing).toEqual([{ type: 'writing_saved', lessonId: lesson.id, stage: 'write', value: { words: 6 } }]);
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain('river helped');
  });

  it('does not report work that was already saved as new writing', async () => {
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, lesson.id, (p) => ({
      ...p,
      writing: { ...p.writing, text: 'The river helped people grow food' },
    }));
    const user = userEvent.setup();
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await user.click(screen.getByText('Type'));
    expect(tracked().filter((call) => call.type === 'writing_saved')).toEqual([]);
  });

  it('asks nothing of measurement for the writing when nobody is being measured', async () => {
    mocks.state.gate = null;
    mocks.state.org = null;
    const user = userEvent.setup();
    await addCurrentLearner('Amina');
    renderPlayer('write');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await user.click(screen.getByText('Type'));
    expect(tracked().filter((call) => call.type === 'writing_saved')).toEqual([]);
  });
});
