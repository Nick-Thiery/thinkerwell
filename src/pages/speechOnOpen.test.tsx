/**
 * Opening a page with Say it never asks the browser about speech
 * recognition. In Chromium 153 on touch devices (phones, tablets and touch
 * laptops, which is what the pilot uses), calling
 * SpeechRecognition.available() as Write, Watch, Reflect or Settings opened
 * crashed the tab. Only a tap may do it: Say it in a lesson makes a
 * recognition object, "Check this device" in Settings calls available().
 */
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { lessonPath } from '../app/lessonUrls';
import { getLesson, type Lesson, type StageId } from '../content';
import { LessonPlayerProvider, useLessonPlayer } from '../lesson';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore, type DeviceSettings } from '../storage';
import { mockSpeechRecognition, restoreSpeechMocks } from '../test/speechMocks';
import { ReflectStage } from './lesson/reflect/ReflectStage';
import { WatchStage } from './lesson/watch/WatchStage';
import { WriteStage } from './lesson/write/WriteStage';
import { SettingsPage } from './SettingsPage';

const lesson = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  restoreSpeechMocks();
  await deleteAllData();
});

function WhenReady({ children }: { children: ReactElement }) {
  const { status } = useLessonPlayer();
  return status === 'ready' ? children : null;
}

const STAGES = {
  write: () => <WriteStage />,
  watch: () => <WatchStage />,
  reflect: () => <ReflectStage />,
} satisfies Partial<Record<StageId, () => ReactElement>>;

function renderPage(page: keyof typeof STAGES | 'settings') {
  if (page === 'settings') {
    return render(
      <MemoryRouter initialEntries={['/settings']}>
        <LearnerSessionProvider>
          <SettingsPage />
        </LearnerSessionProvider>
      </MemoryRouter>,
    );
  }
  return render(
    <MemoryRouter initialEntries={[lessonPath(lesson.id, page)]}>
      <LearnerSessionProvider>
        <LessonPlayerProvider lesson={lesson} step={page}>
          <WhenReady>{STAGES[page]()}</WhenReady>
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

/** Lets everything the page started as it opened (storage reads, effects, timers at 0) run. */
async function settle() {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

const DEVICES: Array<[string, Partial<DeviceSettings>]> = [
  ['nothing checked or allowed yet', {}],
  ['checked: on-device speech to text is ready', { speechCheck: { status: 'available', checkedAt: '2026-09-28T12:00:00.000Z' } }],
  ['checked: the download is needed first', { speechCheck: { status: 'downloadable', checkedAt: '2026-09-28T12:00:00.000Z' } }],
  ['online speech-to-text allowed', { partner: { allowOnlineDictation: true } }],
];

describe('opening Write, Watch, Reflect and Settings never asks the browser about speech recognition', { timeout: 30_000 }, () => {
  it.each(DEVICES)('%s', async (_name, settings) => {
    // Chrome's shape: both names, available(), install() and processLocally.
    const mock = mockSpeechRecognition({ availability: 'available', prefixedToo: true });
    await (await getStore()).updateSettings(settings);

    for (const page of ['write', 'watch', 'reflect', 'settings'] as const) {
      const view = renderPage(page);
      if (page === 'settings') await screen.findByRole('heading', { level: 2, name: 'Say it: speech to text' });
      else await screen.findAllByRole('textbox');
      await settle();
      expect(mock.available, page).not.toHaveBeenCalled();
      expect(mock.install, page).not.toHaveBeenCalled();
      expect(mock.construct, page).not.toHaveBeenCalled();
      view.unmount();
    }
    expect(mock.instances).toHaveLength(0);
  });

  it('while Say it shows, and while the Settings page shows the saved check', async () => {
    const mock = mockSpeechRecognition({ availability: 'available', prefixedToo: true });
    await (await getStore()).updateSettings({ speechCheck: { status: 'available', checkedAt: '2026-09-28T12:00:00.000Z' } });

    const write = renderPage('write');
    expect(await screen.findByRole('button', { name: 'Say it' })).toBeInTheDocument();
    write.unmount();
    const watch = renderPage('watch');
    expect(await screen.findAllByRole('button', { name: 'Say it' })).toHaveLength(2);
    watch.unmount();
    const reflect = renderPage('reflect');
    expect(await screen.findAllByRole('button', { name: 'Say it' })).toHaveLength(lesson.reflect.prompts.length);
    reflect.unmount();
    renderPage('settings');
    expect(await screen.findByText(/What learners say is not sent anywhere/)).toBeInTheDocument();
    await settle();

    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.construct).not.toHaveBeenCalled();
  });
});
