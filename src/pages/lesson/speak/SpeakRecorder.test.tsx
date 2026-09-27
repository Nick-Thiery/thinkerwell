import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { lessonPath } from '../../../app/lessonUrls';
import { getLesson, type Lesson } from '../../../content';
import { LessonPlayerProvider, useLessonPlayer } from '../../../lesson';
import { LearnerSessionProvider } from '../../../session';
import { deleteAllData, getStore } from '../../../storage';
import { mockAudioPlayback, mockMediaRecorder, restoreSpeechMocks } from '../../../test/speechMocks';
import { SpeakStage } from './SpeakStage';

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

function WhenReady() {
  const { status } = useLessonPlayer();
  return status === 'ready' ? <SpeakStage /> : null;
}

function renderSpeak({ lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[lessonPath(lesson.id, 'speak')]}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <LessonPlayerProvider lesson={lesson} step="speak">
          <WhenReady />
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const recorderRegion = () => screen.findByRole('region', { name: 'Record yourself (optional)' });

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Record yourself', { timeout: 30_000 }, () => {
  it("is hidden where the browser can't record", async () => {
    renderSpeak();
    await screen.findByRole('radiogroup', { name: 'How did you practise?' });
    await settle();
    expect(screen.queryByRole('region', { name: /Record yourself/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument();
  });

  it('is hidden when the device lists no microphone', async () => {
    mockMediaRecorder({ devices: [{ kind: 'audiooutput' }] });
    renderSpeak();
    await screen.findByRole('radiogroup', { name: 'How did you practise?' });
    await settle();
    expect(screen.queryByRole('region', { name: /Record yourself/ })).not.toBeInTheDocument();
  });

  it('asks for the microphone only on Start, then records, stops and keeps the clip on the device', async () => {
    const user = userEvent.setup();
    const media = mockMediaRecorder();
    const learnerId = await addCurrentLearner();
    renderSpeak();
    const region = await recorderRegion();
    expect(screen.getByText(/You can record yourself if you like/)).toBeInTheDocument();
    expect(within(region).getByText('Your recording stays on this device. Nobody else hears it.')).toBeInTheDocument();
    expect(media.getUserMedia).not.toHaveBeenCalled();
    // Next stays the one primary button.
    expect(within(region).getByRole('button', { name: 'Start recording' })).toHaveClass('tw-btn-secondary');

    await user.click(within(region).getByRole('button', { name: 'Start recording' }));
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    const stop = await within(region).findByRole('button', { name: 'Stop' });
    expect(stop).toHaveFocus();
    expect(within(region).getByText(/Recording 0:0\d/)).toBeInTheDocument();
    expect(screen.getByText('Recording.', { selector: '[aria-live]' })).toBeInTheDocument();

    await user.click(stop);
    const listenBack = await within(region).findByRole('button', { name: 'Listen back' });
    expect(listenBack).toHaveFocus();
    expect(media.trackStop).toHaveBeenCalled();
    expect(screen.getByText('Recording stopped. It stays on this device.', { selector: '[aria-live]' })).toBeInTheDocument();

    const store = await getStore();
    await waitFor(async () => expect(await store.getRecording(learnerId, lesson.id)).toBeDefined());
    // Recording never counts towards Speak being done.
    expect((await store.getProgress(learnerId, lesson.id))?.stagesDone ?? []).not.toContain('speak');
  });

  it('keeps only the latest clip, and Delete removes it', async () => {
    const user = userEvent.setup();
    mockMediaRecorder();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.saveRecording(learnerId, lesson.id, new Blob(['old'], { type: 'audio/webm' }), 42_000);
    renderSpeak();
    const region = await recorderRegion();
    // The saved clip is back, with its length.
    expect(await within(region).findByRole('button', { name: 'Listen back' })).toBeInTheDocument();
    expect(within(region).getByText('0:42')).toBeInTheDocument();

    await user.click(within(region).getByRole('button', { name: 'Record again' }));
    await user.click(await within(region).findByRole('button', { name: 'Stop' }));
    await within(region).findByRole('button', { name: 'Listen back' });
    await waitFor(async () => {
      const saved = await store.getRecording(learnerId, lesson.id);
      expect(saved?.durationMs).toBeLessThan(42_000);
    });

    await user.click(within(region).getByRole('button', { name: 'Delete' }));
    expect(await within(region).findByRole('button', { name: 'Start recording' })).toHaveFocus();
    await waitFor(async () => expect(await store.getRecording(learnerId, lesson.id)).toBeUndefined());
  });

  it('still shows a saved clip when no microphone is listed, so it can be heard and deleted', async () => {
    mockMediaRecorder({ devices: [] });
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.saveRecording(learnerId, lesson.id, new Blob(['old'], { type: 'audio/webm' }), 5000);
    renderSpeak();
    const region = await recorderRegion();
    expect(await within(region).findByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('plays the clip back from the device', async () => {
    const user = userEvent.setup();
    mockMediaRecorder();
    const playback = mockAudioPlayback();
    renderSpeak();
    const region = await recorderRegion();
    await user.click(within(region).getByRole('button', { name: 'Start recording' }));
    await user.click(await within(region).findByRole('button', { name: 'Stop' }));
    await user.click(await within(region).findByRole('button', { name: 'Listen back' }));
    expect(playback.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(playback.play).toHaveBeenCalledTimes(1);
  });

  it('keeps a look-around recording in memory only', async () => {
    const user = userEvent.setup();
    mockMediaRecorder();
    const learnerId = await addCurrentLearner();
    renderSpeak({ lookAround: true });
    const region = await recorderRegion();
    expect(within(region).getByText("Not saved while you look around. It's gone when you leave this page.")).toBeInTheDocument();
    await user.click(within(region).getByRole('button', { name: 'Start recording' }));
    await user.click(await within(region).findByRole('button', { name: 'Stop' }));
    await within(region).findByRole('button', { name: 'Listen back' });
    await settle();
    const store = await getStore();
    expect(await store.getRecording(learnerId, lesson.id)).toBeUndefined();
  });

  it('says so, plainly, when the microphone is refused', async () => {
    const user = userEvent.setup();
    mockMediaRecorder({ getUserMediaError: 'NotAllowedError' });
    renderSpeak();
    const region = await recorderRegion();
    await user.click(within(region).getByRole('button', { name: 'Start recording' }));
    expect(await within(region).findByText(/Recording needs the microphone/)).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  });

  it('keeps a recording in progress when the learner leaves the stage', async () => {
    const user = userEvent.setup();
    const media = mockMediaRecorder();
    const learnerId = await addCurrentLearner();
    const view = renderSpeak();
    const region = await recorderRegion();
    await user.click(within(region).getByRole('button', { name: 'Start recording' }));
    await within(region).findByRole('button', { name: 'Stop' });
    view.unmount();
    expect(media.trackStop).toHaveBeenCalled();
    const store = await getStore();
    await waitFor(async () => expect(await store.getRecording(learnerId, lesson.id)).toBeDefined());
  });
});
