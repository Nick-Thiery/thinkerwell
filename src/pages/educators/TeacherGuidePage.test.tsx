import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/routes';
import { getLesson, getLessons, getLessonSection, getVisualUrl, type Lesson } from '../../content';
import { t } from '../../i18n';
import { formatDuration } from '../../lesson/format';
import { planTotal, SESSION_PLAN } from './sessionPlan';
import { TeacherGuidePage, youtubeWatchUrl } from './TeacherGuidePage';

const L10 = getLesson('towns-near-rivers') as Lesson;

function renderGuide(lesson: Lesson) {
  return render(<TeacherGuidePage lesson={lesson} />, {
    wrapper: ({ children }) => {
      const router = createMemoryRouter([{ path: '*', element: children }]);
      return <RouterProvider router={router} />;
    },
  });
}

/** Text with runs of white space made single, as it reads. */
const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** The h2 section of the guide with this heading. */
function part(name: string): HTMLElement {
  return screen.getByRole('heading', { level: 2, name }).closest('section') as HTMLElement;
}

describe('SESSION_PLAN', () => {
  it('adds up to 45 minutes, and to 30 in the shorter plan', () => {
    expect(planTotal('minutes')).toBe(45);
    expect(planTotal('short')).toBe(30);
    expect(SESSION_PLAN.map((row) => row.step)).toEqual(['warmUp', 'read', 'check', 'write', 'speak', 'watch', 'reflect']);
  });
});

describe('TeacherGuidePage', () => {
  it.each(getLessons().map((lesson) => [lesson.number, lesson] as const))(
    'lesson %i: has everything a teacher needs, from the lesson file',
    (_number, lesson) => {
      const { unmount } = renderGuide(lesson);
      const sheet = screen.getByRole('article', { name: lesson.title });
      const text = squash(sheet.textContent);
      const section = getLessonSection(lesson);

      // Title, section, essential question, learning goal, time.
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: lesson.title })).toBeInTheDocument();
      expect(text).toContain(section.title);
      expect(text).toContain(lesson.essentialQuestion);
      expect(text).toContain(lesson.learningGoal);
      expect(text).toContain(`About ${lesson.estimatedMinutes[0]}–${lesson.estimatedMinutes[1]} min`);

      // Notes: sensitive topics first, in their own marked box, then the rest.
      const before = part('Before you teach');
      if (lesson.sensitiveNotes.length > 0 || lesson.watch.contentNote) {
        const box = within(before).getByRole('heading', { level: 3, name: 'Sensitive topics: read before class' }).parentElement!;
        for (const note of lesson.sensitiveNotes) expect(squash(box.textContent)).toContain(note);
        if (lesson.watch.contentNote) expect(squash(box.textContent)).toContain('The video has a content note.');
        if (lesson.educatorNotes.length > 0) {
          const notes = within(before).getByRole('heading', { level: 3, name: 'Teaching notes' });
          expect(box.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
      } else {
        expect(within(before).queryByText('Sensitive topics: read before class')).not.toBeInTheDocument();
      }
      for (const note of lesson.educatorNotes) expect(squash(before.textContent)).toContain(note);

      // Key words, with their meanings and examples.
      const keyWords = squash(part('Key words').textContent);
      for (const entry of lesson.read.glossary) {
        expect(keyWords).toContain(entry.word);
        expect(keyWords).toContain(entry.definition);
        expect(keyWords).toContain(entry.example);
      }

      // The evidence and the picture.
      const evidence = part('The evidence and the picture');
      expect(squash(evidence.textContent)).toContain(lesson.evidence.question);
      for (const card of lesson.evidence.cards) expect(squash(evidence.textContent)).toContain(card.title);
      if (lesson.visual) {
        expect(within(evidence).getByRole('img', { name: lesson.visual.alt })).toHaveAttribute('src', getVisualUrl(lesson.visual.src));
      }

      // The quick check: every question, every option, the correct one marked with words and why.
      const check = part('Quick check');
      const questions = within(check).getAllByRole('listitem').filter((li) => li.parentElement?.classList.contains('tw-print-questions'));
      expect(questions).toHaveLength(lesson.read.checks.length);
      lesson.read.checks.forEach((item, index) => {
        const question = questions[index]!;
        expect(squash(question.textContent)).toContain(item.question);
        if (item.type === 'choice') {
          const marked = question.querySelectorAll('.tw-key-option-correct');
          expect(marked).toHaveLength(1);
          const correct = item.options.find((option) => option.correct)!;
          expect(squash(marked[0]!.textContent)).toContain(`Correct answer: ${correct.text}`);
          expect(squash(marked[0]!.textContent)).toContain(`Why: ${correct.feedback.replace(/^Yes\.\s*/, '')}`);
          for (const option of item.options) expect(squash(question.textContent)).toContain(option.text);
          expect(within(question).getAllByText('Correct answer')).toHaveLength(1);
        } else {
          expect(squash(question.textContent)).toContain('there is no single right answer');
        }
      });

      // Write: the task, the self-check and the example answer.
      const write = squash(part('Write').textContent);
      expect(write).toContain(lesson.write.prompt);
      for (const item of lesson.write.selfCheck) expect(write).toContain(item);
      expect(write).toContain(lesson.write.example);

      // Speak.
      const speak = squash(part('Speak').textContent);
      expect(speak).toContain(lesson.speak.partnerTask);
      expect(speak).toContain(lesson.speak.independentTask);

      // Discussion prompts: the warm-up, the think questions and the reflect prompts.
      const discuss = squash(part('Discussion prompts').textContent);
      expect(discuss).toContain(lesson.warmUp.question);
      for (const option of lesson.warmUp.options ?? []) expect(discuss).toContain(option);
      for (const item of lesson.read.checks) {
        if (item.type === 'think') {
          expect(discuss).toContain(item.question);
          expect(discuss).toContain(item.placeholder);
        }
      }
      for (const prompt of lesson.reflect.prompts) expect(discuss).toContain(prompt.text);

      // The video: title, channel, length, a link to watch it, and its content note.
      const video = part('Watch or read instead');
      const videoText = squash(video.textContent);
      expect(videoText).toContain(lesson.watch.title);
      expect(videoText).toContain(lesson.watch.channel);
      expect(videoText).toContain(
        lesson.watch.durationSeconds === null ? 'Not known' : formatDuration(lesson.watch.durationSeconds),
      );
      expect(within(video).getByRole('link', { name: /^Open on YouTube/ })).toHaveAttribute(
        'href',
        `https://www.youtube.com/watch?v=${lesson.watch.youtubeId}`,
      );
      if (lesson.watch.contentNote) {
        expect(within(video).getByRole('heading', { level: 3, name: 'Content note' })).toBeInTheDocument();
        expect(videoText).toContain(lesson.watch.contentNote);
      }
      expect(videoText).toContain(lesson.watch.beforeQuestion);
      expect(videoText).toContain(lesson.watch.afterQuestion);

      // Sources.
      const sources = part('Sources');
      expect(within(sources).getByText(t('pages.teacherGuide.sourcesIntro'))).toBeInTheDocument();
      for (const source of lesson.sources) {
        expect(within(sources).getByRole('link', { name: new RegExp(`^${source.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toHaveAttribute(
          'href',
          source.url,
        );
      }

      // Nothing loads from a video host: the video is only linked.
      expect(sheet.querySelector('iframe')).toBeNull();
      expect([...sheet.querySelectorAll('img')].every((img) => !/youtube|ytimg/.test(img.getAttribute('src') ?? ''))).toBe(true);
      unmount();
    },
  );

  it('has a session plan table whose minutes add up to 45, with a 30-minute column and a note on shortening', () => {
    renderGuide(L10);
    const plan = part('Session plan');
    const table = within(plan).getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Step', 'What to do', '45 min', '30 min']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Warm-up',
      'Read in parts',
      'Quick check',
      'Write',
      'Speak',
      'Watch or read instead',
      'Reflect',
      'Total',
    ]);
    const minutes = (column: number) => rows.slice(0, -1).map((row) => Number(within(row).getAllByRole('cell')[column]!.textContent) || 0);
    const total = within(rows.at(-1)!).getAllByRole('cell');
    expect(minutes(1).reduce((a, b) => a + b)).toBe(45);
    expect(total[1]).toHaveTextContent('45');
    expect(minutes(2).reduce((a, b) => a + b)).toBe(30);
    expect(total[2]).toHaveTextContent('30');
    expect(within(rows[5]!).getAllByRole('cell')[2]).toHaveTextContent('Skip');
    expect(within(rows[1]!).getAllByRole('cell')[0]).toHaveTextContent(`Read the ${L10.read.sections.length} parts`);
    expect(plan).toHaveTextContent(/Only 30 minutes\?/);
  });

  it('offers Print, a way back to the section on the Educators page, a preview and the learners\' printout', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderGuide(L10);
    screen.getByRole('button', { name: 'Print' }).click();
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to the educators page' })).toHaveAttribute('href', '/educators?section=geography');
    expect(screen.getByRole('link', { name: 'Preview the lesson' })).toHaveAttribute('href', '/lesson/towns-near-rivers/read?preview=true');
    expect(screen.getByRole('link', { name: 'Print the lesson for learners' })).toHaveAttribute('href', '/lesson/towns-near-rivers/print');
  });

  it('opens other sites in a new tab and says so', () => {
    renderGuide(L10);
    const link = screen.getByRole('link', { name: 'Open on YouTube (opens in a new tab)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(youtubeWatchUrl('xVf5kZA0HtQ')).toBe('https://www.youtube.com/watch?v=xVf5kZA0HtQ');
  });
});

describe('/educators/lesson/:id', () => {
  function renderAt(path: string) {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);
    return router;
  }

  it('shows the teacher guide, titled for the lesson, with For educators marked in the header', async () => {
    renderAt('/educators/lesson/towns-near-rivers');
    expect(await screen.findByRole('heading', { level: 1, name: L10.title })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Lesson 10: teacher guide · Thinkerwell'));
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'For educators' })).toHaveAttribute('aria-current', 'page');
  });

  it('redirects an old Base44 id', async () => {
    const router = renderAt('/educators/lesson/l6');
    await waitFor(() => expect(router.state.location.pathname).toBe('/educators/lesson/towns-near-rivers'));
  });

  it('is not found for an unknown lesson', async () => {
    renderAt('/educators/lesson/nope');
    expect(await screen.findByRole('heading', { level: 1, name: "This page isn't here" })).toBeInTheDocument();
  });
});
