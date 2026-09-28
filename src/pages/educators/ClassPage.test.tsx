import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLessonByNumber, getSection, type Lesson } from '../../content';
import { findLocale, I18nProvider, type LoadedLocale } from '../../i18n';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore, type StageId } from '../../storage';
import { ClassPage } from './ClassPage';

const lesson = (n: number) => getLessonByNumber(n) as Lesson;

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  await deleteAllData();
});

function renderClass(loaded?: LoadedLocale) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <LearnerSessionProvider>
            <ClassPage />
          </LearnerSessionProvider>
        ),
      },
    ],
    { initialEntries: ['/educators/class'] },
  );
  render(
    <I18nProvider loaded={loaded}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

// Dari with a few made-up messages, as a translation would have them. Fixtures, not translations.
const dari: LoadedLocale = {
  definition: { ...findLocale('fa-AF')!, ready: true },
  messages: { pages: { classView: { lessonsOf: 'FIXTURE {completed} / {total}', lastActive: 'FIXTURE last active', lesson: 'FIXTURE {number}: {title}' } } },
};

async function addLearner(name: string, classCode?: string): Promise<string> {
  const store = await getStore();
  return (await store.addLearner({ name, colour: 'geography', ...(classCode ? { classCode } : {}) })).id;
}

async function finish(learnerId: string, numbers: number[]): Promise<void> {
  const store = await getStore();
  for (const n of numbers) {
    await store.updateProgress(learnerId, lesson(n).id, (p) => ({
      ...p,
      stagesDone: ['read', 'write', 'speak', 'reflect'],
      reflections: { 0: 'An answer.' },
      completedAt: new Date().toISOString(),
    }));
  }
}

async function start(learnerId: string, n: number, stage: StageId): Promise<void> {
  const store = await getStore();
  await store.updateProgress(learnerId, lesson(n).id, (p) => ({ ...p, stagesDone: ['read'], currentStage: stage }));
}

/** A learner's card, found by its name. */
async function card(name: string): Promise<HTMLElement> {
  return screen.findByRole('article', { name });
}

/** "History & Human Stories: 5 of 9" for each section on a card. */
function sectionCounts(article: HTMLElement): string[] {
  const list = within(article).getByRole('region', { name: 'Lessons finished' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => `${item.querySelector('.tw-class-section-name')!.textContent}: ${item.querySelector('.tw-class-section-count')!.textContent}`);
}

const today = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

describe('ClassPage', { timeout: 20_000 }, () => {
  it('lists every learner by name, with lessons finished per section, where they are, when they last worked and the checks they tried', async () => {
    // Added in this order, listed by name.
    const yusuf = await addLearner('Yusuf', 'HLP-07');
    const amina = await addLearner('Amina');
    await addLearner('bashir');
    await finish(amina, [10, 11, 12, 13, 14, 1, 2]);
    await start(amina, 3, 'write');
    await finish(yusuf, [15]);
    await (await getStore()).recordQuizAttempt(amina, 'geography', { answers: {}, score: 4, total: 10, finishedAt: new Date().toISOString() });
    renderClass();

    expect(await screen.findByRole('heading', { level: 1, name: 'The class on this device' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Learners' });
    expect(within(list).getAllByRole('article').map((article) => within(article).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Amina',
      'bashir',
      'Yusuf',
    ]);

    const aminaCard = await card('Amina');
    expect(sectionCounts(aminaCard)).toEqual([
      'History & Human Stories: 2 of 9',
      'Geography & Our Environment: 5 of 5',
      'Culture, Society & Identity: 0 of 5',
      'Civics, Media & Everyday Economics: 0 of 5',
    ]);
    expect(within(aminaCard).getByText('On now').nextElementSibling).toHaveTextContent(`Lesson 3: ${lesson(3).title}Step: Write`);
    expect(within(aminaCard).getByText('Last active').nextElementSibling).toHaveTextContent(today);
    const aminaChecks = within(aminaCard).getByRole('region', { name: 'Section checks tried' });
    expect(within(aminaChecks).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Geography & Our Environment']);

    const yusufCard = await card('Yusuf');
    expect(within(yusufCard).getByText('Class code HLP-07')).toBeInTheDocument();
    expect(sectionCounts(yusufCard)[2]).toBe('Culture, Society & Identity: 1 of 5');
    expect(within(yusufCard).getByText('On now').nextElementSibling).toHaveTextContent(`Lesson 16: ${lesson(16).title}Up next`);
    expect(within(yusufCard).getByRole('region', { name: 'Section checks tried' })).toHaveTextContent('None yet');

    const bashirCard = await card('bashir');
    expect(within(bashirCard).getByText('On now').nextElementSibling).toHaveTextContent('Not started yet');
    expect(within(bashirCard).getByText('Last active').nextElementSibling).toHaveTextContent('Not yet');

    expect(screen.getByRole('link', { name: 'Print all certificates' })).toHaveAttribute('href', '/educators/class/certificates');
    expect(screen.getByRole('link', { name: 'Back to the educators page' })).toHaveAttribute('href', '/educators');
  });

  it('never shows a score or a ranking, and never links to a journal', async () => {
    const amina = await addLearner('Amina');
    await finish(amina, [1]);
    await (await getStore()).recordQuizAttempt(amina, 'history', { answers: {}, score: 9, total: 10, finishedAt: new Date().toISOString() });
    renderClass();
    const aminaCard = await card('Amina');
    // The only mention of scores is the line saying there are none.
    expect(screen.getByText('There are no scores here, because anyone using this device can open this page.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Learners' }).textContent).not.toMatch(/score|out of|%|\brank|9\s*(of|\/)\s*10/i);
    expect(within(aminaCard).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /journal/i })).not.toBeInTheDocument();
  });

  it('tells learners who share a name apart by the day each was added', async () => {
    await addLearner('Amina');
    await addLearner('Amina');
    renderClass();
    const list = await screen.findByRole('list', { name: 'Learners' });
    const names = within(list)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(names).toHaveLength(2);
    for (const name of names) expect(name).toMatch(/^Amina, added [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });

  it('with no learners, says so and offers to add one', async () => {
    const user = userEvent.setup();
    const router = renderClass();
    expect(await screen.findByRole('heading', { level: 2, name: 'No learners on this device yet.' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Learners' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Print all certificates' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up this device' })).toHaveAttribute('href', '/educators/setup');
    await user.click(screen.getByRole('button', { name: 'Add a learner' }));
    await waitFor(() => expect(`${router.state.location.pathname}${router.state.location.search}`).toBe('/?new=1'));
  });

  it("writes numbers and dates in the interface's language, and keeps course text marked as English", async () => {
    const amina = await addLearner('Amina');
    await finish(amina, [10, 11]);
    await start(amina, 3, 'write');
    renderClass(dari);
    const aminaCard = await card('Amina');
    const geography = within(aminaCard).getByText(getSection('geography')!.title);
    expect(geography).toHaveAttribute('lang', 'en');
    expect(geography).toHaveAttribute('dir', 'ltr');
    expect(geography.parentElement!.querySelector('.tw-class-section-count')).toHaveTextContent('FIXTURE ۲ / ۵');
    const lessonTitle = within(aminaCard).getByText(lesson(3).title);
    expect(lessonTitle).toHaveAttribute('lang', 'en');
    expect(lessonTitle.closest('.tw-class-lesson')).toHaveTextContent(`FIXTURE ۳: ${lesson(3).title}`);
    const lastActive = within(aminaCard).getByText('FIXTURE last active').nextElementSibling!;
    expect(lastActive.textContent).toBe(new Intl.DateTimeFormat('fa-AF', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()));
    // The initial is part of the name, never translated.
    expect(aminaCard.querySelector('.tw-avatar')).toHaveAttribute('translate', 'no');
  });

  it('adds no language markup in English', async () => {
    const amina = await addLearner('Amina');
    await finish(amina, [10]);
    renderClass();
    const aminaCard = await card('Amina');
    expect(within(aminaCard).getByText(getSection('geography')!.title)).not.toHaveAttribute('lang');
    expect(aminaCard.querySelectorAll('[lang], [dir]')).toHaveLength(0);
  });

  it('where this browser window has no storage, says there is nothing to show', async () => {
    await deleteAllData();
    vi.stubGlobal('indexedDB', undefined);
    renderClass();
    expect(await screen.findByText(/This browser window can't keep learners' work, so there's nothing to show here\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a learner' })).not.toBeInTheDocument();
  });

  it('shows everyone while someone is looking around too: it reads the device, not a learner', async () => {
    await addLearner('Amina');
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <LearnerSessionProvider forceLookAround>
              <ClassPage />
            </LearnerSessionProvider>
          ),
        },
      ],
      { initialEntries: ['/educators/class'] },
    );
    render(<RouterProvider router={router} />);
    expect(await card('Amina')).toBeInTheDocument();
  });
});
