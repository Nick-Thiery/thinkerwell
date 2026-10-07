import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/routes';
import { getLesson, getLessons, getVisualUrl, type Lesson } from '../../content';
import { LessonPrintPage } from './LessonPrintPage';

const L10 = getLesson('towns-near-rivers') as Lesson;

function renderPrint(lesson: Lesson) {
  return render(<LessonPrintPage lesson={lesson} />, {
    wrapper: ({ children }) => {
      const router = createMemoryRouter([{ path: '*', element: children }]);
      return <RouterProvider router={router} />;
    },
  });
}

/** The first sentence of a text, enough to find it on the page. */
const opening = (text: string) => text.split(/(?<=[.?!])\s/)[0]!.replace(/\s+/g, ' ').trim();

describe('LessonPrintPage', () => {
  it('has the lesson, both reading levels, the key words, the picture and every task', () => {
    renderPrint(L10);
    const sheet = screen.getByRole('article', { name: L10.title });
    const text = sheet.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(screen.getByRole('heading', { level: 1, name: L10.title })).toBeInTheDocument();
    expect(text).toContain(L10.essentialQuestion);
    expect(text).toContain(L10.learningGoal);
    expect(text).toContain(L10.warmUp.question);

    // Both levels, every part.
    expect(screen.getByRole('heading', { level: 2, name: 'Reading: Standard English' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Reading: Simpler English' })).toBeInTheDocument();
    for (const part of L10.read.sections) {
      expect(screen.getAllByRole('heading', { level: 3, name: part.heading })).toHaveLength(2);
      expect(text).toContain(opening(part.text));
      expect(text).toContain(opening(part.simpler));
    }

    // Key words: listed with their meanings, and bold in the reading.
    for (const entry of L10.read.glossary) {
      expect(text).toContain(entry.definition);
      expect(text).toContain(entry.example);
    }
    expect(sheet.querySelectorAll('.tw-print-reading-text strong').length).toBeGreaterThan(0);

    // The picture, with its alt text, from this site.
    const picture = within(sheet).getByRole('img', { name: L10.visual!.alt });
    expect(picture).toHaveAttribute('src', getVisualUrl(L10.visual!.src));

    // The quick check and every task.
    for (const check of L10.read.checks) expect(text).toContain(check.question);
    for (const task of [L10.write.prompt, L10.speak.partnerTask, L10.speak.independentTask, L10.watch.beforeQuestion, L10.watch.afterQuestion]) {
      expect(text).toContain(task);
    }
    for (const starter of L10.write.sentenceStarters) expect(text).toContain(starter);
    for (const point of L10.watch.keyPoints) expect(text).toContain(point);
    for (const prompt of L10.reflect.prompts) expect(text).toContain(prompt.text);

    // Nothing from a video host: the video is only named.
    expect(sheet.innerHTML).not.toMatch(/youtube|ytimg/i);
  });

  it('offers Print and a way back to the lesson', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderPrint(L10);
    screen.getByRole('button', { name: 'Print' }).click();
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to the lesson' })).toHaveAttribute('href', '/lesson/towns-near-rivers/read');
  });

  it('renders every lesson', () => {
    for (const lesson of getLessons()) {
      const { unmount } = renderPrint(lesson);
      expect(screen.getByRole('heading', { level: 1, name: lesson.title })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 3, name: lesson.read.sections[0]!.heading })).toHaveLength(2);
      unmount();
    }
  });
});

describe('/lesson/:id/print', () => {
  function renderAt(path: string) {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);
    return router;
  }

  it('shows the print view, titled for the lesson', async () => {
    renderAt('/lesson/towns-near-rivers/print');
    expect(await screen.findByRole('heading', { level: 1, name: L10.title })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Lesson 10: print | Thinkerwell'));
  });

  it('redirects an old Base44 id', async () => {
    const router = renderAt('/lesson/l6/print');
    await waitFor(() => expect(router.state.location.pathname).toBe('/lesson/towns-near-rivers/print'));
  });

  it('is not found for an unknown lesson', async () => {
    renderAt('/lesson/nope/print');
    expect(await screen.findByRole('heading', { level: 1, name: "This page isn't here" })).toBeInTheDocument();
  });
});
