import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { contentFor, englishContent, type Lesson } from '../content';
import { I18nProvider } from '../i18n';
import { FIXTURE_UNAPPROVED_ID, FIXTURE_VIDEO_ID, ID_VIDEOS_FIXTURE, indonesianLocale, translationWithVideos } from '../test/localVideoFixtures';
import { CreditsPage } from './CreditsPage';
import { TeacherGuidePage } from './educators/TeacherGuidePage';
import { LessonPrintPage } from './print/LessonPrintPage';

// The teacher guide, the print view and the Credits page for a language with an approved
// video of its own (src/content/localVideos.ts): its title and channel are the language's
// own words, not marked English; every video that can be shown is credited.

vi.mock('../content/localVideoFiles', () => ({
  localVideoCodes: () => ['id'],
  loadLocalVideosFile: (code: string) => Promise.resolve(code === 'id' ? ID_VIDEOS_FIXTURE : undefined),
}));

const translation = translationWithVideos(ID_VIDEOS_FIXTURE);
const content = contentFor(translation);
const local = content.getLessonByNumber(5) as Lesson;
const notApproved = content.getLessonByNumber(9) as Lesson;
const entry = ID_VIDEOS_FIXTURE.lessons.L05 as unknown as { title: string; channel: string; summary: string };

function inIndonesian(children: ReactNode) {
  const router = createMemoryRouter([{ path: '*', element: <I18nProvider loaded={indonesianLocale(translation)}>{children}</I18nProvider> }]);
  return <RouterProvider router={router} />;
}

describe('TeacherGuidePage', () => {
  it("lists the local video with its title and channel unmarked, and its link on YouTube", () => {
    render(inIndonesian(<TeacherGuidePage lesson={local} />));
    const video = screen.getByRole('heading', { level: 2, name: 'Watch or read instead' }).closest('section') as HTMLElement;
    expect(within(video).getByText(entry.title)).not.toHaveAttribute('lang');
    expect(within(video).getByText(entry.channel)).not.toHaveAttribute('lang');
    expect(within(video).getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute('href', `https://www.youtube.com/watch?v=${FIXTURE_VIDEO_ID}`);
  });

  it('keeps the English video marked English when the lesson has no approved local video', () => {
    render(inIndonesian(<TeacherGuidePage lesson={notApproved} />));
    const english = englishContent.getLessonByNumber(9)!.watch;
    const video = screen.getByRole('heading', { level: 2, name: 'Watch or read instead' }).closest('section') as HTMLElement;
    expect(within(video).getByText(english.title)).toHaveAttribute('lang', 'en');
    expect(within(video).getByRole('link', { name: /Open on YouTube/ })).toHaveAttribute('href', `https://www.youtube.com/watch?v=${english.youtubeId}`);
  });
});

describe('LessonPrintPage', () => {
  it("prints the local video's written version, with its title unmarked", () => {
    render(inIndonesian(<LessonPrintPage lesson={local} />));
    const sheet = screen.getByRole('article');
    for (const mention of within(sheet).getAllByText(entry.title, { exact: false })) expect(mention.closest('[lang="en"]')).toBeNull();
    expect(sheet.textContent).toContain(entry.summary.split('\n\n')[0]);
  });

  it('keeps the English video marked English otherwise', () => {
    render(inIndonesian(<LessonPrintPage lesson={notApproved} />));
    const english = englishContent.getLessonByNumber(9)!.watch;
    expect(within(screen.getByRole('article')).getAllByText(english.title, { exact: false })[0]!.closest('[lang="en"]')).not.toBeNull();
  });
});

describe('CreditsPage', () => {
  it("credits every language's approved videos beside the English ones, in either language", async () => {
    render(<CreditsPage />);
    const videos = screen.getByRole('region', { name: 'Videos' });
    // The Indonesian video is listed under Lesson 5 (after the files load), the English one stays.
    const link = await within(videos).findByRole('link', { name: new RegExp(entry.title) });
    expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${FIXTURE_VIDEO_ID}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(within(link).getByText(entry.title)).toHaveAttribute('lang', 'id');
    const english = englishContent.getLessonByNumber(5)!.watch;
    const item = link.closest('li') as HTMLElement;
    expect(within(item).getByRole('link', { name: new RegExp(english.title.replace(/[.*+?^${}()|[\]\\|]/g, '\\$&')) })).toHaveAttribute(
      'href',
      `https://www.youtube.com/watch?v=${english.youtubeId}`,
    );
    expect(within(item).getByText('Bahasa Indonesia')).toHaveAttribute('lang', 'id');
    expect(within(item).getByText(entry.channel)).toHaveAttribute('lang', 'id');
    // A video that isn't approved is not credited.
    expect(videos.innerHTML).not.toContain(FIXTURE_UNAPPROVED_ID);
    expect(videos.querySelector('iframe, img')).toBeNull();
  });

  it('lists the same videos with the interface in Indonesian', async () => {
    render(inIndonesian(<CreditsPage />));
    const videos = await screen.findByRole('region', { name: /Video/ });
    await waitFor(() => expect(within(videos).getByRole('link', { name: new RegExp(entry.title) })).toBeInTheDocument());
    const english = englishContent.getLessonByNumber(5)!.watch;
    expect(within(videos).getByRole('link', { name: new RegExp(english.title.replace(/[.*+?^${}()|[\]\\|]/g, '\\$&')) })).toBeInTheDocument();
  });
});
