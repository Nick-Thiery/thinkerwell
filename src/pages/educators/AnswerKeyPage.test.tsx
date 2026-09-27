import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/routes';
import { getLessonByNumber, getQuiz, getSection, getSections, type QuizFile, type Section } from '../../content';
import { t } from '../../i18n';
import { AnswerKeyPage } from './AnswerKeyPage';

function renderKey(section: Section, quiz: QuizFile) {
  return render(<AnswerKeyPage section={section} quiz={quiz} />, {
    wrapper: ({ children }) => {
      const router = createMemoryRouter([{ path: '*', element: children }]);
      return <RouterProvider router={router} />;
    },
  });
}

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

describe('AnswerKeyPage', () => {
  it.each(getSections().map((section) => [section.id, section] as const))(
    '%s: every question with its example, options, the correct one marked, the feedback and its lesson',
    (_id, section) => {
      const quiz = getQuiz(section.id)!;
      const { unmount } = renderKey(section, quiz);
      const sheet = screen.getByRole('article', { name: `Answer key: ${section.title}` });

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      // Practice only: never blocks, no time limit, try again.
      expect(sheet).toHaveTextContent('The section check is for practice. It never blocks learners');

      const questions = [...sheet.querySelectorAll<HTMLElement>('section.tw-key-question')];
      expect(questions).toHaveLength(quiz.questions.length);
      quiz.questions.forEach((question, index) => {
        const block = questions[index]!;
        const text = squash(block.textContent);
        expect(
          within(block).getByRole('heading', {
            level: 2,
            name: `Question ${index + 1} · ${t(`pages.sectionCheck.skill.${question.skill}`)}`,
          }),
        ).toBeInTheDocument();
        if (question.stimulus) {
          expect(text).toContain(question.stimulus.title);
          for (const line of question.stimulus.type === 'items' ? question.stimulus.items : [question.stimulus.body]) {
            expect(text).toContain(line);
          }
        }
        expect(text).toContain(question.question);

        // Options in the file's order, each with its feedback; only the correct one is marked, in words.
        const options = block.querySelectorAll('.tw-key-option');
        expect(options).toHaveLength(question.options.length);
        question.options.forEach((option, optionIndex) => {
          const shown = squash(options[optionIndex]!.textContent);
          expect(shown).toContain(option.text);
          expect(shown).toContain(`Feedback: ${option.feedback}`);
          expect(shown.startsWith('Correct answer:')).toBe(option.correct);
          expect(options[optionIndex]!.classList.contains('tw-key-option-correct')).toBe(option.correct);
        });
        expect(within(block).getAllByText('Correct answer')).toHaveLength(1);

        // The lesson it comes from, linked to that lesson's teacher guide.
        const lesson = getLessonByNumber(question.lesson)!;
        expect(within(block).getByRole('link', { name: `From Lesson ${lesson.number}: ${lesson.title}` })).toHaveAttribute(
          'href',
          `/educators/lesson/${lesson.id}`,
        );
      });
      unmount();
    },
  );

  it('offers Print and a way back to the section on the Educators page', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderKey(getSection('culture')!, getQuiz('culture')!);
    screen.getByRole('button', { name: 'Print' }).click();
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Back to the educators page' })).toHaveAttribute('href', '/educators?section=culture');
  });
});

describe('/educators/section/:id/answers', () => {
  function renderAt(path: string) {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(<RouterProvider router={router} />);
    return router;
  }

  it.each(getSections().map((section) => [section.id, section] as const))('%s shows its answer key, titled for it', async (id, section) => {
    renderAt(`/educators/section/${id}/answers`);
    const title = `Answer key: ${section.title}`;
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(`${title} · Thinkerwell`));
  });

  it('is not found for an unknown section', async () => {
    renderAt('/educators/section/nope/answers');
    expect(await screen.findByRole('heading', { level: 1, name: "This page isn't here" })).toBeInTheDocument();
  });
});
