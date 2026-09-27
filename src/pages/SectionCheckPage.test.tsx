import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { getQuiz, getSection, type QuizFile } from '../content';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore } from '../storage';
import { SectionCheckPage } from './SectionCheckPage';

afterEach(async () => {
  await deleteAllData();
});

const section = getSection('geography')!;
const quiz = getQuiz('geography')!;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderCheck({ lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/section/geography/check']}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <SectionCheckPage section={section} />
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

async function addAndChooseLearner(name = 'Amina'): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name, colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

/** The correct option's exact text (ChoiceOption's accessible name matches it exactly before it's chosen). */
function correctOptionText(question: QuizFile['questions'][number]): string {
  return question.options.find((o) => o.correct)!.text;
}

/** Plays through every question, choosing whatever `pick` names for it, then moving on. */
async function answerAll(
  user: ReturnType<typeof userEvent.setup>,
  pick: (question: QuizFile['questions'][number], index: number) => string,
) {
  for (let i = 0; i < quiz.questions.length; i++) {
    const question = quiz.questions[i]!;
    await screen.findByRole('heading', { level: 2, name: question.question });
    await user.click(screen.getByRole('radio', { name: pick(question, i) }));
    const isLast = i === quiz.questions.length - 1;
    await user.click(screen.getByRole('button', { name: isLast ? 'See your results' : 'Next question' }));
  }
}

describe('SectionCheckPage', () => {
  it('shows the intro with the check facts, then starts on "Start the check"', async () => {
    const user = userEvent.setup();
    renderCheck({ lookAround: true });
    expect(await screen.findByRole('heading', { level: 1, name: `Section check: ${section.title}` })).toBeInTheDocument();
    expect(screen.getByText(`What do you remember from ${section.title}?`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${quiz.questions.length} questions about Lessons`))).toBeInTheDocument();
    expect(screen.getByText('Nothing is saved while you look around')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start the check' }));
    expect(await screen.findByRole('heading', { level: 2, name: quiz.questions[0]!.question })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it("shows the learner's real progress in the section, and none while looking around", async () => {
    await addAndChooseLearner();
    const view = renderCheck();
    expect(await screen.findByRole('img', { name: `0 of ${section.lessons.length} done` })).toBeInTheDocument();
    view.unmount();

    renderCheck({ lookAround: true });
    await screen.findByRole('heading', { level: 1, name: `Section check: ${section.title}` });
    expect(screen.queryByRole('img', { name: /done$/ })).not.toBeInTheDocument();
  });

  it('answers a question, shows feedback and a link to the lesson it came from, and advances', async () => {
    const user = userEvent.setup();
    renderCheck({ lookAround: true });
    await user.click(await screen.findByRole('button', { name: 'Start the check' }));

    const first = quiz.questions[0]!;
    const nextButton = screen.getByRole('button', { name: 'Next question' });
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: correctOptionText(first) }));
    expect(screen.getByText('Correct', { selector: '.tw-feedback-title' })).toBeInTheDocument();
    expect(screen.getByText(first.options.find((o) => o.correct)!.feedback.replace(/^Yes\. /, ''))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(`^From Lesson ${first.lesson}:`) })).toBeInTheDocument();
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);
    await screen.findByRole('heading', { level: 2, name: quiz.questions[1]!.question });
  });

  it('a perfect run saves a completed attempt for a chosen learner and shows a high-score message with nothing to review', async () => {
    const user = userEvent.setup();
    const learnerId = await addAndChooseLearner();
    renderCheck();
    await user.click(await screen.findByRole('button', { name: 'Start the check' }));

    await answerAll(user, correctOptionText);

    expect(
      await screen.findByRole('heading', { level: 1, name: `${quiz.questions.length} out of ${quiz.questions.length}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(quiz.results.high)).toBeInTheDocument();
    expect(screen.queryByText('Worth another look')).not.toBeInTheDocument();
    expect(screen.getByText('Your score is saved on this device.')).toBeInTheDocument();

    const store = await getStore();
    await waitFor(async () => {
      const record = await store.getQuizRecord(learnerId, 'geography');
      expect(record?.best.score).toBe(quiz.questions.length);
      expect(record?.attempts).toBe(1);
    });
  });

  it('lists a missed question under "Worth another look", linking to its lesson, and saves nothing while looking around', async () => {
    const user = userEvent.setup();
    renderCheck({ lookAround: true });
    await user.click(await screen.findByRole('button', { name: 'Start the check' }));

    const firstQuestion = quiz.questions[0]!;
    const wrongFirst = firstQuestion.options.find((o) => !o.correct)!.text;
    await answerAll(user, (question, i) => (i === 0 ? wrongFirst : correctOptionText(question)));

    expect(
      await screen.findByRole('heading', { level: 1, name: `${quiz.questions.length - 1} out of ${quiz.questions.length}` }),
    ).toBeInTheDocument();
    const review = screen.getByRole('heading', { level: 2, name: 'Worth another look' }).closest('section')!;
    expect(within(review).getByText(new RegExp(`^Question 1: ${escapeRegExp(firstQuestion.question)}`))).toBeInTheDocument();
    expect(screen.getByText("Nothing is saved while you're looking around.")).toBeInTheDocument();

    const store = await getStore();
    expect(await store.listQuizRecords('guest')).toEqual([]);
  });

  it('"Try the check again" goes back to the intro with a clean slate', async () => {
    const user = userEvent.setup();
    renderCheck({ lookAround: true });
    await user.click(await screen.findByRole('button', { name: 'Start the check' }));
    await answerAll(user, correctOptionText);
    await screen.findByRole('button', { name: 'Try the check again' });

    await user.click(screen.getByRole('button', { name: 'Try the check again' }));
    expect(await screen.findByRole('heading', { level: 1, name: `Section check: ${section.title}` })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start the check' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});
