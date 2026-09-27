import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { lessonPath } from '../../app/lessonUrls';
import { getLesson, type Lesson, type StageId } from '../../content';
import { LessonPlayerProvider, useLessonPlayer } from '../../lesson';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { mockSpeechRecognition, restoreSpeechMocks } from '../../test/speechMocks';
import { ReflectStage } from './reflect/ReflectStage';
import { WatchStage } from './watch/WatchStage';
import { WriteStage } from './write/WriteStage';

const lesson = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  restoreSpeechMocks();
  await deleteAllData();
});

async function addCurrentLearner(): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

async function allowOnline(): Promise<void> {
  const store = await getStore();
  await store.updateSettings({ partner: { allowOnlineDictation: true } });
}

function WhenReady({ children }: { children: ReactElement }) {
  const { status } = useLessonPlayer();
  return status === 'ready' ? children : null;
}

const STAGES: Record<'write' | 'watch' | 'reflect', () => ReactElement> = {
  write: () => <WriteStage />,
  watch: () => <WatchStage />,
  reflect: () => <ReflectStage />,
};

function renderStage(stage: keyof typeof STAGES) {
  return render(
    <MemoryRouter initialEntries={[lessonPath(lesson.id, stage as StageId)]}>
      <LearnerSessionProvider>
        <LessonPlayerProvider lesson={lesson} step={stage as StageId}>
          <WhenReady>{STAGES[stage]()}</WhenReady>
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

/** Lets the availability check (a promise) settle. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Say it in the lesson', { timeout: 30_000 }, () => {
  it('is hidden in Write, Watch and Reflect where speech can only go online and nobody allowed it', async () => {
    mockSpeechRecognition({ onDevice: false });
    for (const stage of ['write', 'watch', 'reflect'] as const) {
      const view = renderStage(stage);
      await screen.findAllByRole('textbox');
      await settle();
      expect(screen.queryByRole('button', { name: 'Say it' })).not.toBeInTheDocument();
      view.unmount();
    }
    const view = renderStage('write');
    expect(await screen.findByText(/Spelling does not matter here\. Nothing is saved/)).toBeInTheDocument();
    expect(screen.queryByText(/Tap Say it/)).not.toBeInTheDocument();
    view.unmount();
  });

  it('shows on every writing box in Write, Watch and Reflect when it runs on the device', async () => {
    mockSpeechRecognition({ availability: 'available' });
    const write = renderStage('write');
    expect(await screen.findAllByRole('button', { name: 'Say it' })).toHaveLength(1);
    expect(screen.getByText(/Tap Say it to talk instead of typing/)).toBeInTheDocument();
    write.unmount();

    const watch = renderStage('watch');
    expect(await screen.findAllByRole('button', { name: 'Say it' })).toHaveLength(2);
    watch.unmount();

    renderStage('reflect');
    expect(await screen.findAllByRole('button', { name: 'Say it' })).toHaveLength(lesson.reflect.prompts.length);
  });

  it('shows for the online path once an educator allowed it', async () => {
    mockSpeechRecognition({ onDevice: false });
    await allowOnline();
    renderStage('write');
    expect(await screen.findByRole('button', { name: 'Say it' })).toBeInTheDocument();
  });

  it("puts spoken words in Write's box, saves them like typing, and a starter goes after them", async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    const learnerId = await addCurrentLearner();
    renderStage('write');
    const box = await screen.findByRole('textbox', { name: 'Your answer' });
    await user.click(await screen.findByRole('button', { name: 'Say it' }));
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/^Listening\. Speak slowly/, { selector: '.tw-help' })).toBeInTheDocument();
    expect(mock.latest().processLocally).toBe(true);

    act(() => mock.latest().hear([['i would build near the river', true]]));
    expect(box).toHaveValue('I would build near the river');
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Say it' })).toBeInTheDocument());

    const store = await getStore();
    await waitFor(async () => {
      expect((await store.getProgress(learnerId, lesson.id))?.writing.text).toBe('I would build near the river');
    });

    // Still editable, and a sentence starter goes after the spoken words.
    const starter = lesson.write.sentenceStarters[0]!;
    await user.click(screen.getByRole('button', { name: starter }));
    expect((box as HTMLTextAreaElement).value.startsWith('I would build near the river ')).toBe(true);
  });

  it('explains in the helper line when the microphone is refused', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    renderStage('write');
    await user.click(await screen.findByRole('button', { name: 'Say it' }));
    act(() => mock.latest().fail('not-allowed'));
    // In the box's helper line, and said once by the live region.
    expect(await screen.findByText(/Say it needs the microphone/, { selector: '.tw-help' })).toBeInTheDocument();
    expect(screen.getByText(/Say it needs the microphone/, { selector: '[aria-live]' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Say it' })).toBeInTheDocument();
    // Typing takes the note away.
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Hi');
    expect(screen.queryByText(/Say it needs the microphone/, { selector: '.tw-help' })).not.toBeInTheDocument();
  });

  it('a spoken answer to the required Reflect prompt completes the lesson', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    const learnerId = await addCurrentLearner();
    renderStage('reflect');
    const required = lesson.reflect.prompts.findIndex((p) => p.required);
    const box = await screen.findByRole('textbox', { name: lesson.reflect.prompts[required]!.text });
    const sayIt = await within(box.closest('.tw-writing') as HTMLElement).findByRole('button', { name: 'Say it' });
    await user.click(sayIt);
    act(() => mock.latest().hear([['rivers can flood', true]]));
    expect(box).toHaveValue('Rivers can flood');
    const store = await getStore();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.completedAt).not.toBeNull();
      expect(saved?.stagesDone).toContain('reflect');
    });
  });

  it("a spoken answer to Watch's after question counts once listening ends", async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition();
    const learnerId = await addCurrentLearner();
    renderStage('watch');
    const box = await screen.findByRole('textbox', { name: new RegExp(lesson.watch.afterQuestion.slice(0, 20)) });
    const sayIt = await within(box.closest('.tw-writing') as HTMLElement).findByRole('button', { name: 'Say it' });
    await user.click(sayIt);
    act(() => mock.latest().hear([['boats carry goods', true]]));
    await user.click(within(box.closest('.tw-writing') as HTMLElement).getByRole('button', { name: 'Stop' }));
    const store = await getStore();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, lesson.id);
      expect(saved?.watch.afterAnswer).toBe('Boats carry goods');
      expect(saved?.stagesDone).toContain('watch');
    });
  });
});
