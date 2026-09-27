import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLesson, getLessonSection, getLessons, type Lesson } from '../../../content';
import {
  applyStageEvent,
  LessonPlayerProvider,
  LessonPlayerTestProvider,
  useLessonPlayer,
  type LessonPlayerValue,
} from '../../../lesson';
import { LearnerSessionProvider } from '../../../session';
import { DEFAULT_SETTINGS, deleteAllData, emptyProgress, getStore, type DeviceSettings, type LessonProgress } from '../../../storage';
import { WatchStage } from './WatchStage';
import { PLAYER_TIMEOUT_MS, YOUTUBE_EMBED_ORIGIN } from './youtube';

// Rendering the whole stage for 24 lessons is slow on a busy machine; the default 5 s is too tight.
vi.setConfig({ testTimeout: 30_000 });

const L10 = getLesson('towns-near-rivers') as Lesson;
const L09 = getLesson('inventions-and-daily-life') as Lesson;

/** A lesson player held in memory, like look-around: enough to drive the stage without IndexedDB. */
function Harness({
  lesson,
  settings = DEFAULT_SETTINGS,
  initial,
  children,
}: {
  lesson: Lesson;
  settings?: DeviceSettings;
  initial?: Partial<LessonProgress>;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState<LessonProgress>(() => ({
    ...emptyProgress('guest', lesson.id),
    ...initial,
  }));
  const value: LessonPlayerValue = {
    lesson,
    section: getLessonSection(lesson),
    step: 'watch',
    status: 'ready',
    mode: 'look-around',
    saving: false,
    progress,
    saveError: false,
    update: (change) => setProgress(change),
    flush: () => Promise.resolve(),
    stageEvent: (event) => setProgress((p) => applyStageEvent(lesson, p, event, new Date().toISOString())),
    readingLevel: 'standard',
    setReadingLevel: () => undefined,
    settings,
    setListeningSpeed: () => undefined,
    seedOwner: 'visit',
    goTo: () => undefined,
  };
  return (
    <LessonPlayerTestProvider value={value}>
      {children}
      <output data-testid="progress">{JSON.stringify(progress)}</output>
    </LessonPlayerTestProvider>
  );
}

function renderWatch(lesson: Lesson = L10, options: { settings?: DeviceSettings; initial?: Partial<LessonProgress> } = {}) {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${lesson.id}/watch`]}>
      <Harness lesson={lesson} settings={options.settings} initial={options.initial}>
        <WatchStage />
      </Harness>
    </MemoryRouter>,
  );
}

function savedProgress(): LessonProgress {
  return JSON.parse(screen.getByTestId('progress').textContent ?? '{}') as LessonProgress;
}

/** Any trace of a video host in the rendered DOM (attributes included). */
function mentionsVideoHost(container: HTMLElement): boolean {
  return /youtube|ytimg|googlevideo|gstatic|doubleclick/i.test(container.innerHTML);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('WatchStage before the tap', () => {
  it('has no iframe and no video-host URL anywhere in the page', () => {
    const { container } = renderWatch();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(mentionsVideoHost(container)).toBe(false);
    // The local poster shows the content's title, channel and duration.
    expect(screen.getByRole('heading', { name: L10.watch.title })).toBeInTheDocument();
    expect(screen.getByText(L10.watch.channel)).toBeInTheDocument();
    expect(screen.getByText('4:10')).toBeInTheDocument();
    expect(screen.getByText(L10.watch.why)).toBeInTheDocument();
    expect(screen.getByText(/Slow internet\?/)).toBeInTheDocument();
  });

  it('leaves the duration out when the content has none', () => {
    const lesson = getLessons().find((l) => l.watch.durationSeconds === null) as Lesson;
    const { container } = renderWatch(lesson);
    expect(container.querySelector('.tw-video-len')).toBeNull();
  });

  it("keeps the ActionBar's continue as the only primary button", () => {
    const { container } = renderWatch();
    expect(container.querySelectorAll('.tw-btn-primary')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Watch the video' })).toHaveClass('tw-btn-secondary');
  });
});

describe('WatchStage after the tap', () => {
  it('creates one youtube-nocookie iframe with a referrer policy and no autoplay', () => {
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    const frames = container.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    const frame = frames[0] as HTMLIFrameElement;
    const src = frame.getAttribute('src') ?? '';
    expect(src.startsWith(`https://www.youtube-nocookie.com/embed/${L10.watch.youtubeId}?`)).toBe(true);
    expect(src).not.toMatch(/autoplay/i);
    expect(frame.getAttribute('allow') ?? '').not.toMatch(/autoplay/i);
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(frame.getAttribute('title')).toBe(L10.watch.title);
    expect(frame).toHaveAttribute('allowfullscreen');
    expect(frame.getAttribute('loading')).toBe('eager');
    // The Watch button goes; Read instead and Close stay.
    expect(screen.queryByRole('button', { name: 'Watch the video' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Read instead' })).toBeInTheDocument();
    expect(document.activeElement).toBe(frame);
    expect(screen.getByText('The video player is open. Use its play button to start.')).toBeInTheDocument();
  });

  it('closing the video removes the player and returns focus to Watch', () => {
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the video' }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Watch the video' }));
  });

  it('shows the written version with a kind message after 20 seconds without load', () => {
    vi.useFakeTimers();
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    act(() => {
      vi.advanceTimersByTime(PLAYER_TIMEOUT_MS - 1);
    });
    expect(container.querySelector('iframe')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('The video is taking a long time to load.')).toBeInTheDocument();
    expect(screen.getByText(L10.watch.keyPoints[0] as string)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: L10.watch.title }));
    // An automatic switch isn't the learner's choice, so it isn't remembered.
    expect(savedProgress().watch.readInstead).toBe(false);
    // They can try again.
    fireEvent.click(screen.getByRole('button', { name: 'Try the video again' }));
    expect(container.querySelector('iframe')).not.toBeNull();
  });

  function playerSays(frame: HTMLIFrameElement, data: unknown, origin = YOUTUBE_EMBED_ORIGIN) {
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { origin, source: frame.contentWindow, data: JSON.stringify(data) }),
      );
    });
  }

  it("a load event alone doesn't cancel the fallback (it also fires for the browser's error page)", () => {
    vi.useFakeTimers();
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    fireEvent.load(container.querySelector('iframe') as HTMLIFrameElement);
    act(() => {
      vi.advanceTimersByTime(PLAYER_TIMEOUT_MS);
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('The video is taking a long time to load.')).toBeInTheDocument();
  });

  it("the player's own ready message cancels the fallback", () => {
    vi.useFakeTimers();
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    const frame = container.querySelector('iframe') as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toContain('enablejsapi=1');
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    playerSays(frame, { event: 'onReady', id: 1, channel: 'widget' });
    act(() => {
      vi.advanceTimersByTime(PLAYER_TIMEOUT_MS * 2);
    });
    expect(container.querySelector('iframe')).not.toBeNull();
    expect(screen.queryByText('The video is taking a long time to load.')).toBeNull();
  });

  it('ignores ready messages from any other origin', () => {
    vi.useFakeTimers();
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    const frame = container.querySelector('iframe') as HTMLIFrameElement;
    playerSays(frame, { event: 'onReady' }, 'https://example.com');
    act(() => {
      vi.advanceTimersByTime(PLAYER_TIMEOUT_MS);
    });
    expect(container.querySelector('iframe')).toBeNull();
  });

  it("shows the written version when the player can't play the video", () => {
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    const frame = container.querySelector('iframe') as HTMLIFrameElement;
    playerSays(frame, { event: 'onReady' });
    playerSays(frame, { event: 'onError', info: 150 });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText("This video can't play here right now.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try the video again' })).toBeInTheDocument();
  });

  it('shows the written version when the device goes offline while the player loads', () => {
    const { container } = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText("You're offline, so the video can't load now.")).toBeInTheDocument();
  });

  it("with nobody's choice in Settings, follows the browser's data-saver hint: videos off", () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    try {
      const { container } = renderWatch(L10, { settings: { ...DEFAULT_SETTINGS, saveData: null } });
      expect(container.querySelector('.tw-video')).toBeNull();
      expect(screen.getByText(L10.watch.keyPoints[0] as string)).toBeInTheDocument();
      expect(screen.getByText('Videos are off to save data.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Watch the video/ })).not.toBeInTheDocument();
    } finally {
      delete (navigator as unknown as { connection?: unknown }).connection;
    }
  });

  it("Save data turned off in Settings wins over the browser's hint: the video is offered", () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    try {
      const { container } = renderWatch(L10, { settings: { ...DEFAULT_SETTINGS, saveData: false } });
      expect(container.querySelector('.tw-video')).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
      expect(container.querySelector('iframe')).not.toBeNull();
    } finally {
      delete (navigator as unknown as { connection?: unknown }).connection;
    }
  });

  it('opens on the written version, saying why, when the device is offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { container } = renderWatch();
    expect(container.querySelector('.tw-video')).toBeNull();
    expect(screen.getByRole('article', { name: L10.watch.title })).toBeInTheDocument();
    expect(screen.getByText("You're offline, so the video can't load now.")).toBeInTheDocument();
    // For when the connection is back; nothing is saved as the learner's choice.
    expect(screen.getByRole('button', { name: 'Try the video again' })).toBeInTheDocument();
    expect(savedProgress().watch.readInstead).toBe(false);
    onLine.mockRestore();
  });

  it('clears the fallback timer when the stage unmounts', () => {
    const setTimer = vi.spyOn(globalThis, 'setTimeout');
    const clearTimer = vi.spyOn(globalThis, 'clearTimeout');
    const view = renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    const index = setTimer.mock.calls.findIndex((call) => call[1] === PLAYER_TIMEOUT_MS);
    expect(index).toBeGreaterThanOrEqual(0);
    const timerId: unknown = setTimer.mock.results[index]?.value;
    view.unmount();
    expect(clearTimer.mock.calls.some((call) => call[0] === timerId)).toBe(true);
  });

  it('goes straight to the written version when the device is offline by the time the learner taps Watch', () => {
    const { container } = renderWatch();
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText("You're offline, so the video can't load now.")).toBeInTheDocument();
    onLine.mockRestore();
  });
});

describe('WatchStage written version', () => {
  it('Read instead shows the summary and key points, and remembers the choice', () => {
    renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Read instead' }));
    const written = screen.getByRole('article', { name: L10.watch.title });
    expect(within(written).getByText(L10.watch.summary)).toBeInTheDocument();
    expect(within(written).getAllByRole('listitem')).toHaveLength(L10.watch.keyPoints.length);
    expect(document.activeElement).toBe(within(written).getByRole('heading', { name: L10.watch.title }));
    expect(savedProgress().watch.readInstead).toBe(true);
    // Switch back to the video.
    fireEvent.click(within(written).getByRole('button', { name: 'Watch the video instead' }));
    expect(document.querySelector('iframe')).not.toBeNull();
  });

  it('opens on the written version when readInstead was saved', () => {
    const { container } = renderWatch(L10, {
      initial: { watch: { beforeAnswer: '', afterAnswer: '', readInstead: true } },
    });
    expect(screen.getByRole('article', { name: L10.watch.title })).toBeInTheDocument();
    expect(container.querySelector('.tw-video')).toBeNull();
    expect(screen.getByRole('button', { name: 'Watch the video instead' })).toBeInTheDocument();
  });

  it('with Save data on, opens on the written version and never offers the video', () => {
    const { container } = renderWatch(L10, { settings: { ...DEFAULT_SETTINGS, saveData: true } });
    expect(screen.getByRole('article', { name: L10.watch.title })).toBeInTheDocument();
    expect(screen.getByText('Videos are off to save data.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /watch/i })).toBeNull();
    expect(screen.queryByText(/Slow internet\?/)).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(mentionsVideoHost(container)).toBe(false);
    // Forced by the setting, not chosen: not remembered.
    expect(savedProgress().watch.readInstead).toBe(false);
  });
});

describe('WatchStage answers', () => {
  it('saves the before answer', () => {
    renderWatch();
    fireEvent.change(screen.getByLabelText(new RegExp(escape(L10.watch.beforeQuestion))), {
      target: { value: 'Water and food' },
    });
    expect(savedProgress().watch.beforeAnswer).toBe('Water and food');
  });

  it('saves the after answer and marks Watch done on blur', () => {
    renderWatch();
    const box = screen.getByLabelText(new RegExp(escape(L10.watch.afterQuestion)));
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'The soil was good for farming.' } });
    expect(savedProgress().stagesDone).not.toContain('watch');
    fireEvent.blur(box);
    expect(savedProgress().watch.afterAnswer).toBe('The soil was good for farming.');
    expect(savedProgress().stagesDone).toContain('watch');
  });

  it('a blank after answer does not mark Watch done', () => {
    renderWatch();
    const box = screen.getByLabelText(new RegExp(escape(L10.watch.afterQuestion)));
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.blur(box);
    expect(savedProgress().stagesDone).not.toContain('watch');
  });

  it('continuing marks Watch done (it is optional)', () => {
    renderWatch();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Reflect' }));
    expect(savedProgress().stagesDone).toContain('watch');
  });
});

describe('WatchStage content note', () => {
  it('appears only inside a closed "For teachers" note', () => {
    const { container } = renderWatch(L09);
    const note = L09.watch.contentNote as string;
    const details = container.querySelector('details.tw-watch-teachers') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(within(details).getByText('For teachers').closest('summary')).not.toBeNull();
    const matches = within(container).getAllByText(note);
    expect(matches).toHaveLength(1);
    expect(details.contains(matches[0] as HTMLElement)).toBe(true);
  });

  it('is left out when the lesson has none', () => {
    const { container } = renderWatch(L10);
    expect(container.querySelector('details')).toBeNull();
  });

  it('never shows the replacement suggestion', () => {
    for (const lesson of getLessons()) {
      const suggestion = lesson.watch.replacementSuggestion;
      if (!suggestion) continue;
      const view = renderWatch(lesson);
      expect(view.container.innerHTML).not.toContain(suggestion.title);
      view.unmount();
    }
  });
});

describe('WatchStage for every lesson', () => {
  it.each(getLessons().map((lesson) => [lesson.number, lesson] as const))(
    'Lesson %i renders its poster, player and written version without console errors',
    (_number, lesson) => {
      const errors = vi.spyOn(console, 'error');
      const warnings = vi.spyOn(console, 'warn');
      const view = renderWatch(lesson);
      fireEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
      fireEvent.click(screen.getByRole('button', { name: 'Read instead' }));
      expect(screen.getByRole('article', { name: lesson.watch.title })).toBeInTheDocument();
      view.unmount();
      renderWatch(lesson, { settings: { ...DEFAULT_SETTINGS, saveData: true } });
      expect(errors).not.toHaveBeenCalled();
      expect(warnings).not.toHaveBeenCalled();
    },
  );
});

/** Escapes a content string for use in a RegExp. */
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// With the real lesson player: what a learner chooses is saved on the device and restored.
describe('WatchStage with a saved learner', () => {
  afterEach(async () => {
    await deleteAllData();
  });

  function Ready() {
    const { status } = useLessonPlayer();
    return status === 'ready' ? <WatchStage /> : null;
  }

  function renderSaved() {
    return render(
      <MemoryRouter initialEntries={[`/lesson/${L10.id}/watch`]}>
        <LearnerSessionProvider>
          <LessonPlayerProvider lesson={L10} step="watch">
            <Ready />
          </LessonPlayerProvider>
        </LearnerSessionProvider>
      </MemoryRouter>,
    );
  }

  async function addCurrentLearner(): Promise<string> {
    const store = await getStore();
    const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.setCurrentLearnerId(learner.id);
    return learner.id;
  }

  it('saves Read instead and opens on the written version next time', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    const first = renderSaved();
    await user.click(await screen.findByRole('button', { name: 'Read instead' }));
    await waitFor(async () => expect((await store.getProgress(learnerId, L10.id))?.watch.readInstead).toBe(true));
    first.unmount();

    renderSaved();
    expect(await screen.findByRole('article', { name: L10.watch.title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Watch the video' })).toBeNull();
  });

  it('saves the after answer and marks Watch done when the box loses focus', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    renderSaved();
    const box = await screen.findByLabelText(new RegExp(escape(L10.watch.afterQuestion)));
    await user.type(box, 'Good soil');
    await user.tab();
    await waitFor(async () => {
      const saved = await store.getProgress(learnerId, L10.id);
      expect(saved?.watch.afterAnswer).toBe('Good soil');
      expect(saved?.stagesDone).toContain('watch');
    });
  });

  it('opens on the written version when the device has Save data on', async () => {
    await addCurrentLearner();
    const store = await getStore();
    await store.updateSettings({ saveData: true });
    const { container } = renderSaved();
    expect(await screen.findByText('Videos are off to save data.')).toBeInTheDocument();
    expect(container.querySelector('.tw-video')).toBeNull();
    expect(screen.queryByRole('button', { name: /watch/i })).toBeNull();
  });
});
