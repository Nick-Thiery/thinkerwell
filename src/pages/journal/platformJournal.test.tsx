import { useEffect } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { courseSummaries } from '../../content/catalog';
import { loadCourseOutlines } from '../../content/outline';
import { getLesson, type Lesson } from '../../content';
import { LearnerSessionProvider, useLearnerSession } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { JournalPage } from '../JournalPage';

// Justin's follow-up of 10 November 2026: /journal lists the chosen learner's
// writing and reflections from every course, and switching learners never
// shows one learner's words under another. Three disposable learners:
//   A  Our World and Digital World (one lesson shared with B), one lesson unfinished
//   B  Southeast Asia Through Time and Art, Architecture and Society, no Our World at all
//   C  nothing

const OUR_WORLD = getLesson('towns-near-rivers') as Lesson;
const DW = courseSummaries['digital-world']!.lessonIds;
const SAT = courseSummaries['southeast-asia-through-time']!.lessonIds;
const AAS = courseSummaries['art-architecture-society']!.lessonIds;
const SHARED = DW[9]!; // Digital World, Lesson 10: both A and B answered it

// The session, kept where the tests can reach it (set in an effect, not while rendering).
const sessionRef: { current: ReturnType<typeof useLearnerSession> | null } = { current: null };
function Probe() {
  const current = useLearnerSession();
  useEffect(() => {
    sessionRef.current = current;
  });
  return null;
}
const session = {
  chooseLearner: (id: string) => sessionRef.current!.chooseLearner(id),
};

afterEach(async () => {
  await deleteAllData();
});

async function makeLearners() {
  const store = await getStore();
  const a = await store.addLearner({ name: 'Ada', colour: 'lemon' });
  const b = await store.addLearner({ name: 'Bao', colour: 'history' });
  const c = await store.addLearner({ name: 'Cleo', colour: 'civics' });
  const write = (learnerId: string, lessonId: string, text: string, reflection?: string) =>
    store.updateProgress(learnerId, lessonId, (p) => ({
      ...p,
      writing: { ...p.writing, text },
      reflections: reflection ? { 0: reflection } : p.reflections,
    }));
  await write(a.id, OUR_WORLD.id, 'A writes about rivers.', 'A reflects on trade.');
  await write(a.id, SHARED, 'A answer in the shared Digital World lesson.');
  await write(b.id, SHARED, 'B answer in the shared Digital World lesson.');
  await write(b.id, SAT[0]!, 'B writes about Ban Chiang.');
  await write(b.id, AAS[0]!, 'B writes about a building.', 'B reflects on art.');
  await store.setCurrentLearnerId(a.id);
  return { a, b, c };
}

function renderJournal() {
  return render(
    <MemoryRouter initialEntries={['/journal']}>
      <LearnerSessionProvider>
        <Probe />
        <JournalPage />
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const choose = (id: string) => act(async () => session.chooseLearner(id));

describe('the journal across every course', () => {
  it('lists writing from all four courses, each lesson named with its course and full title', async () => {
    const store = await getStore();
    const learner = await store.addLearner({ name: 'Dee', colour: 'lemon' });
    for (const id of [OUR_WORLD.id, DW[0]!, SAT[0]!, AAS[0]!]) {
      await store.updateProgress(learner.id, id, (p) => ({ ...p, writing: { ...p.writing, text: `Words in ${id}` } }));
    }
    await store.setCurrentLearnerId(learner.id);
    renderJournal();
    const outlines = await loadCourseOutlines();

    for (const id of [OUR_WORLD.id, DW[0]!, SAT[0]!, AAS[0]!]) expect(await screen.findByText(`Words in ${id}`)).toBeInTheDocument();
    for (const [courseId, name] of [
      ['digital-world', 'Digital World'],
      ['southeast-asia-through-time', 'Southeast Asia Through Time'],
      ['art-architecture-society', 'Art, Architecture and Society'],
    ] as const) {
      expect(screen.getByText(name, { selector: '.tw-journal-course *, .tw-journal-course' })).toBeInTheDocument();
      const first = outlines[courseId]!.lessons[0]!;
      expect(screen.getByText(`Lesson 1 · ${first.titles.en}`)).toBeInTheDocument();
    }
    expect(screen.getByText(`Lesson 10 · ${OUR_WORLD.title}`)).toBeInTheDocument();
    // Four lessons, each its own group even though three are "Lesson 1".
    expect(screen.getByText('4 pieces of writing from 4 lessons')).toBeInTheDocument();
  });

  it('shows a learner with only newer-course work a full journal, with no Our World entry', async () => {
    const { b } = await makeLearners();
    const store = await getStore();
    await store.setCurrentLearnerId(b.id);
    renderJournal();

    expect(await screen.findByText('B writes about Ban Chiang.')).toBeInTheDocument();
    expect(screen.getByText('B writes about a building.')).toBeInTheDocument();
    expect(screen.getByText('B reflects on art.')).toBeInTheDocument();
    expect(screen.queryByText(/Nothing saved yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(`Lesson 10 · ${OUR_WORLD.title}`)).not.toBeInTheDocument();
  });

  it('keeps every learner’s answers apart, including in a lesson two of them answered, through A → B → C → A', async () => {
    const { a, b, c } = await makeLearners();
    renderJournal();

    expect(await screen.findByText('A writes about rivers.')).toBeInTheDocument();
    expect(screen.getByText('A answer in the shared Digital World lesson.')).toBeInTheDocument();
    expect(screen.queryByText(/^B /)).not.toBeInTheDocument();

    await choose(b.id);
    expect(await screen.findByText('B answer in the shared Digital World lesson.')).toBeInTheDocument();
    expect(screen.queryByText(/^A /)).not.toBeInTheDocument();
    expect(screen.queryByText('A answer in the shared Digital World lesson.')).not.toBeInTheDocument();

    await choose(c.id);
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
    expect(screen.queryByText(/ writes /)).not.toBeInTheDocument();

    await choose(a.id);
    expect(await screen.findByText('A answer in the shared Digital World lesson.')).toBeInTheDocument();
    expect(screen.queryByText('B answer in the shared Digital World lesson.')).not.toBeInTheDocument();
  });

  it('shows the empty message only when a learner has nothing in any course', async () => {
    const { c } = await makeLearners();
    const store = await getStore();
    await store.setCurrentLearnerId(c.id);
    renderJournal();
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it('keeps an edit made just before switching learners with the learner who made it', async () => {
    const user = userEvent.setup();
    const { a, b } = await makeLearners();
    renderJournal();
    const entry = (await screen.findByText('A answer in the shared Digital World lesson.')).closest('article')!;
    await user.click(within(entry).getByRole('button', { name: 'Edit' }));
    const box = await screen.findByRole('textbox');
    await user.clear(box);
    await user.type(box, 'A edited answer.');

    // Save, and switch in the same breath: the write is still pending.
    await act(async () => {
      const saving = user.click(screen.getByRole('button', { name: 'Save' }));
      await session.chooseLearner(b.id);
      await saving;
    });

    expect(await screen.findByText('B answer in the shared Digital World lesson.')).toBeInTheDocument();
    expect(screen.queryByText('A edited answer.')).not.toBeInTheDocument();
    const store = await getStore();
    const sharedA = (await store.listProgress(a.id)).find((p) => p.lessonId === SHARED);
    const sharedB = (await store.listProgress(b.id)).find((p) => p.lessonId === SHARED);
    expect(sharedA?.writing.text).toBe('A edited answer.');
    expect(sharedB?.writing.text).toBe('B answer in the shared Digital World lesson.');

    await choose(a.id);
    await waitFor(() => expect(screen.getByText('A edited answer.')).toBeInTheDocument());
  });
});
