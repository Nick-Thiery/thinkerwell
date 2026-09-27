import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { getLesson, type Lesson } from '../../content';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { JournalPrintPage } from './JournalPrintPage';

const L10 = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  await deleteAllData();
});

function renderJournal({ lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/journal/print']}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <JournalPrintPage />
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

describe('JournalPrintPage', () => {
  it("prints the learner's writing and reflections, grouped by lesson, with the prompts", async () => {
    const id = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(id, L10.id, (p) => ({
      ...p,
      writing: { ...p.writing, text: 'I would build the town at the River site.\n\nThe soil is good.' },
      reflections: { 0: 'Water and trade.' },
    }));
    renderJournal();

    expect(await screen.findByRole('heading', { level: 1, name: 'My journal' })).toBeInTheDocument();
    expect(screen.getByText('Amina')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: L10.title })).toBeInTheDocument();
    expect(screen.getByText('Lesson 10 · Geography & Our Environment')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Reflection', 'Writing']);
    expect(screen.getByText(L10.reflect.prompts[0]!.text)).toBeInTheDocument();
    expect(screen.getByText('Water and trade.')).toBeInTheDocument();
    expect(screen.getByText(L10.write.prompt)).toBeInTheDocument();
    expect(screen.getByText('I would build the town at the River site.')).toBeInTheDocument();
    expect(screen.getByText('The soil is good.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to my journal' })).toHaveAttribute('href', '/journal');
  });

  it('says when nothing is written yet, with nothing to print', async () => {
    await addCurrentLearner();
    renderJournal();
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
  });

  it('asks a guest to choose who is learning', async () => {
    await addCurrentLearner();
    renderJournal({ lookAround: true });
    expect(await screen.findByText(/Choose who's learning to print their journal/)).toBeInTheDocument();
    expect(screen.queryByText('Amina')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
  });
});
