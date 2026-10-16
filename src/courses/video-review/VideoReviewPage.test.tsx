import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import path from 'node:path';
import { createMemoryRouter, RouterProvider } from 'react-router';
import data from 'virtual:thinkerwell/video-review';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { deleteAllData, getStore } from '../../storage';
import { videoReviewData } from '../../../tools/videos/reviewData';
import { previewAssetFileName, previewChunkFileName, previewCourseOfModule, VIDEO_REVIEW_ID } from '../build';

// The reviewers' page for local-language Watch videos (/review/videos): what it
// shows in each language, that nothing comes from YouTube before the tap, that
// answers stay on the device and become the text the reviewer sends, and that the
// build keeps it out of every learner's download.

afterEach(async () => {
  await deleteAllData();
});

async function openIn(language: string | null, lesson?: string) {
  const store = await getStore();
  await store.updateSettings({ language });
  const router = createMemoryRouter(routes, { initialEntries: [`/review/videos${lesson ? `?lesson=${lesson}` : ''}`] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('/review/videos', () => {
  it('in English, says which languages have videos to review and how to choose one', async () => {
    await openIn(null);
    expect(await screen.findByRole('heading', { level: 1, name: 'Review the Watch videos' })).toBeInTheDocument();
    expect(screen.getByText(/The videos to review are in Bahasa Indonesia and Bahasa Melayu/)).toBeInTheDocument();
  });

  it('in Indonesian, shows a lesson\'s suggested video, its part, questions and written version, and nothing from YouTube before the tap', async () => {
    const user = userEvent.setup();
    await openIn('id', 'L01');
    expect(await screen.findByRole('heading', { level: 1, name: 'Video Tonton dalam Bahasa Indonesia' })).toBeInTheDocument();
    const lesson = data.id!.find((l) => l.key === 'L01')!;
    const video = lesson.recommended!;
    expect(screen.getByRole('heading', { name: video.title })).toBeInTheDocument();
    expect(screen.getByText(/^Tonton dari 1:35 sampai 3:33/)).toBeInTheDocument();
    expect(screen.getByText(video.beforeQuestion)).toBeInTheDocument();
    expect(screen.getByText(video.keyPoints[0]!)).toBeInTheDocument();
    // YouTube made an English voice for this one: the reviewer is told to listen for Indonesian.
    expect(screen.getByText(/YouTube membuat suara bahasa Inggris untuk video ini/)).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Tonton video' }));
    const frame = document.querySelector('iframe')!;
    expect(frame.src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/2vnbcL9bDDI\?/);
    expect(frame.src).toContain('start=95');
    expect(frame.src).toContain('end=213');
    expect(frame.src).toContain('hl=id');
  });

  it('keeps the answer and comment on this device and puts them in the text to copy', async () => {
    const user = userEvent.setup();
    await openIn('id', 'L01');
    await screen.findByRole('heading', { level: 1, name: 'Video Tonton dalam Bahasa Indonesia' });
    await user.type(screen.getByLabelText('Namamu'), 'Dewi');
    await user.click(within(screen.getByRole('group', { name: 'Jawabanmu' })).getByRole('button', { name: 'Pakai dengan perubahan' }));
    await user.type(screen.getByLabelText(/Apa yang perlu diubah/), 'Ganti kata pertama.');
    await waitFor(async () => {
      const settings = await (await getStore()).getSettings();
      expect(settings.videoReview?.answers['id/L01']).toEqual({ decision: 'change', comment: 'Ganti kata pertama.' });
      expect(settings.videoReview?.reviewer).toBe('Dewi');
    });
    const summary = screen.getByLabelText<HTMLTextAreaElement>('Jawabanmu', { selector: 'textarea' });
    expect(summary.value).toContain('Tinjauan video Tonton dalam Bahasa Indonesia');
    expect(summary.value).toContain('Peninjau: Dewi');
    expect(summary.value).toContain('Pelajaran 1 (2vnbcL9bDDI): Pakai dengan perubahan');
    expect(summary.value).toContain('Komentar: Ganti kata pertama.');
    expect(summary.value).toContain('Pelajaran 2 (');
    expect(summary.value).toContain('Belum ditinjau');
  });

  it('in Malay, shows the suggested video and the answer buttons in Malay', async () => {
    await openIn('ms', 'L19');
    expect(await screen.findByRole('heading', { level: 1, name: 'Video Tonton dalam Bahasa Melayu' })).toBeInTheDocument();
    const video = data.ms!.find((l) => l.key === 'L19')!.recommended!;
    expect(screen.getByRole('heading', { name: video.title })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Jawapan kamu' })).getByRole('button', { name: 'Jangan guna' })).toBeInTheDocument();
  });

  it('moves between lessons with Next, and the address keeps the lesson', async () => {
    const user = userEvent.setup();
    const router = await openIn('id', 'L01');
    await screen.findByRole('heading', { level: 1, name: 'Video Tonton dalam Bahasa Indonesia' });
    await user.click(screen.getByRole('button', { name: 'Pelajaran berikutnya' }));
    expect(router.state.location.search).toBe('?lesson=L02');
    expect(screen.getByRole('heading', { level: 2, name: /^Pelajaran 2:/ })).toHaveFocus();
  });
});

describe('what the page shows', () => {
  it('lists every lesson in each translated language, with the recommended videos and nothing rejected', () => {
    const fresh = videoReviewData(path.resolve(import.meta.dirname, '../../..'), ['id', 'ms']);
    expect(fresh).toEqual(data);
    for (const code of ['id', 'ms']) {
      expect(data[code]!.map((l) => l.key)).toEqual(Array.from({ length: 24 }, (_, i) => `L${String(i + 1).padStart(2, '0')}`));
      for (const lesson of data[code]!) {
        if (lesson.recommended) expect(lesson.recommended.keyPoints.length).toBeGreaterThan(0);
      }
    }
    expect(JSON.stringify(data)).not.toContain('screening');
  });
});

describe('the build', () => {
  it('keeps the page, its styles and its data in assets/preview/video-review/, which is never precached', () => {
    expect(previewCourseOfModule('/repo/src/courses/video-review/VideoReviewPage.tsx')).toBe('video-review');
    expect(previewCourseOfModule(VIDEO_REVIEW_ID)).toBe('video-review');
    expect(previewChunkFileName({ facadeModuleId: '/repo/src/courses/video-review/VideoReviewPage.tsx' })).toBe('assets/preview/video-review/[name]-[hash].js');
    expect(previewAssetFileName({ originalFileNames: ['src/courses/video-review/videoReview.css'] })).toBe('assets/preview/video-review/[name]-[hash][extname]');
  });
});
