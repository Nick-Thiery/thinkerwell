import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { contentFor, englishContent, type Lesson } from '../../../content';
import { I18nProvider } from '../../../i18n';
import { applyStageEvent, LessonPlayerTestProvider, type LessonPlayerValue } from '../../../lesson';
import { DEFAULT_SETTINGS, emptyProgress, type LessonProgress } from '../../../storage';
import { FIXTURE_UNAPPROVED_ID, FIXTURE_VIDEO_ID, ID_VIDEOS_FIXTURE, indonesianLocale, translationWithVideos } from '../../../test/localVideoFixtures';
import { WatchStage } from './WatchStage';

// A lesson whose language has an approved video of its own (src/content/localVideos.ts)
// shows it as the lesson's video: its title and channel are in the language and not
// marked English, there is no "This video is in English" note, and the written version
// is the local video's. A lesson whose entry is not approved is exactly as before.

const NOTE = /This video is in English/;

const translation = translationWithVideos(ID_VIDEOS_FIXTURE);
const content = contentFor(translation);
const local = content.getLessonByNumber(5) as Lesson;
const notApproved = content.getLessonByNumber(9) as Lesson;
const localEntry = ID_VIDEOS_FIXTURE.lessons.L05 as unknown as { title: string; channel: string; summary: string; keyPoints: string[]; contentNote: string; beforeQuestion: string };

function Harness({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const [progress, setProgress] = useState<LessonProgress>(() => emptyProgress('guest', lesson.id));
  const value: LessonPlayerValue = {
    lesson,
    section: content.getLessonSection(lesson),
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
    settings: DEFAULT_SETTINGS,
    setListeningSpeed: () => undefined,
    seedOwner: 'visit',
    goTo: () => undefined,
  };
  return <LessonPlayerTestProvider value={value}>{children}</LessonPlayerTestProvider>;
}

function renderIndonesian(lesson: Lesson) {
  return render(
    <I18nProvider loaded={indonesianLocale(translation)}>
      <MemoryRouter initialEntries={[`/lesson/${lesson.id}/watch`]}>
        <Harness lesson={lesson}>
          <WatchStage />
        </Harness>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('WatchStage with an approved local video', () => {
  it("shows the local video's title and channel as the language's own words, with no English note", () => {
    const { container } = renderIndonesian(local);
    const title = screen.getByRole('heading', { name: localEntry.title });
    expect(title).not.toHaveAttribute('lang');
    const channel = screen.getByText(localEntry.channel);
    expect(channel).not.toHaveAttribute('lang');
    expect(container.querySelector('[lang="en"]')).toBeNull();
    expect(screen.queryByText(NOTE)).toBeNull();
    // The questions and the teachers' note are the local video's.
    expect(screen.getByText(localEntry.beforeQuestion)).toBeInTheDocument();
    expect(screen.getByText(localEntry.contentNote)).toBeInTheDocument();
  });

  it('still asks for nothing from YouTube before the tap, and then plays the local video, not the English one', async () => {
    const { container } = renderIndonesian(local);
    expect(container.innerHTML).not.toMatch(/youtube|ytimg|googlevideo/i);
    expect(container.querySelector('iframe')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    const frame = container.querySelector('iframe')!;
    expect(frame.getAttribute('src')).toContain(`/embed/${FIXTURE_VIDEO_ID}`);
    expect(frame.getAttribute('src')).toContain('youtube-nocookie.com');
    expect(frame.getAttribute('src')).not.toContain(englishContent.getLessonByNumber(5)!.watch.youtubeId);
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(frame).not.toHaveAttribute('lang');
    expect(frame.getAttribute('title')).toBe(localEntry.title);
  });

  it("keeps Read instead: the written version is the local video's, in the language", async () => {
    const { container } = renderIndonesian(local);
    await userEvent.click(screen.getByRole('button', { name: 'Read instead' }));
    const written = screen.getByRole('article');
    const heading = within(written).getByRole('heading', { name: localEntry.title });
    expect(heading).not.toHaveAttribute('lang');
    for (const paragraph of localEntry.summary.split('\n\n')) expect(within(written).getByText(paragraph)).toBeInTheDocument();
    for (const point of localEntry.keyPoints) expect(within(written).getByText(point)).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('[lang="en"]')).toBeNull();
  });
});

describe('WatchStage with an entry that is not approved', () => {
  it('is exactly as before: the English video, marked English, with the note that it is in English', async () => {
    const { container } = renderIndonesian(notApproved);
    const english = englishContent.getLessonByNumber(9)!.watch;
    expect(notApproved.watch).toEqual(english);
    expect(screen.getByRole('heading', { name: english.title })).toHaveAttribute('lang', 'en');
    expect(screen.getByText(english.channel)).toHaveAttribute('lang', 'en');
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(FIXTURE_UNAPPROVED_ID);
    await userEvent.click(screen.getByRole('button', { name: 'Watch the video' }));
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain(`/embed/${english.youtubeId}`);
  });
});
