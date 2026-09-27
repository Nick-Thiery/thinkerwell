import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { getLesson, type Lesson } from '../content';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore } from '../storage';
import { JournalPage } from './JournalPage';

const L10 = getLesson('towns-near-rivers') as Lesson;

afterEach(async () => {
  await deleteAllData();
});

function renderJournal({ lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/journal']}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <JournalPage />
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

describe('JournalPage', () => {
  it('tells a guest looking around that nothing is saved, with no filter to show', async () => {
    renderJournal({ lookAround: true });
    expect(await screen.findByText(/looking around, so nothing here is saved/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Choose who's learning" })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Show' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Print my journal' })).not.toBeInTheDocument();
  });

  it('asks a device with nobody chosen yet to choose a learner', async () => {
    renderJournal();
    expect(await screen.findByText("Choose who's learning to see their journal.")).toBeInTheDocument();
  });

  it('says nothing is saved yet for a learner with an empty journal', async () => {
    await addCurrentLearner();
    renderJournal();
    expect(await screen.findByText(/Nothing saved yet\. Write or reflect/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Show' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Print my journal' })).toHaveAttribute('href', '/journal/print');
  });

  it('lists saved reflections before writing, grouped under the lesson, with a running count', async () => {
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, L10.id, (p) => ({
      ...p,
      writing: { ...p.writing, text: 'I would build the town at the River site.' },
      reflections: { 1: 'Why do rivers flood?', 0: 'Water and trade.' },
    }));
    renderJournal();

    expect(await screen.findByText(`Lesson 10 · ${L10.title}`)).toBeInTheDocument();
    expect(screen.getByText('3 pieces of writing from 1 lesson')).toBeInTheDocument();
    const entries = screen.getAllByText(/^(Reflection|Writing)$/, { selector: 'span' });
    expect(entries.map((el) => el.textContent)).toEqual(['Reflection', 'Reflection', 'Writing']);
    expect(screen.getByText('Water and trade.')).toBeInTheDocument();
    expect(screen.getByText('Why do rivers flood?')).toBeInTheDocument();
    expect(screen.getByText('I would build the town at the River site.')).toBeInTheDocument();
  });

  it('filters to just Writing or Reflections, and updates the count', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, L10.id, (p) => ({
      ...p,
      writing: { ...p.writing, text: 'My town plan.' },
      reflections: { 0: 'Water and trade.' },
    }));
    renderJournal();
    await screen.findByText('My town plan.');

    await user.click(screen.getByRole('button', { name: 'Writing' }));
    expect(screen.getByText('My town plan.')).toBeInTheDocument();
    expect(screen.queryByText('Water and trade.')).not.toBeInTheDocument();
    expect(screen.getByText('1 piece of writing from 1 lesson')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reflections' }));
    expect(screen.queryByText('My town plan.')).not.toBeInTheDocument();
    expect(screen.getByText('Water and trade.')).toBeInTheDocument();
  });

  it('edits an entry in place and saves it back to the same slot', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, L10.id, (p) => ({
      ...p,
      reflections: { 0: 'Water and trade.' },
    }));
    renderJournal();
    const entry = (await screen.findByText('Water and trade.')).closest('article')!;

    await user.click(within(entry).getByRole('button', { name: 'Edit' }));
    // The read-only article is replaced by a new one while editing (it's a
    // different branch of the component), so `entry` is now a detached
    // node: query the page for the textbox and Save button instead.
    const textbox = await screen.findByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, 'Water, trade and safety from floods.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Wait for the save to finish and the entry to go back to reading. (While
    // it saves, the textbox itself holds the new words, so looking for the
    // text straight away found the textbox, which the finished save then
    // removed: a race that failed now and then under load.)
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    const saved = screen.getByText('Water, trade and safety from floods.');
    expect(saved.closest('article')).not.toHaveClass('tw-entry-editing');
    expect(screen.queryByText('Water and trade.')).not.toBeInTheDocument();

    const [record] = await store.listProgress(learnerId);
    expect(record?.reflections[0]).toBe('Water, trade and safety from floods.');
  });

  it('cancels an edit without saving anything', async () => {
    const user = userEvent.setup();
    const learnerId = await addCurrentLearner();
    const store = await getStore();
    await store.updateProgress(learnerId, L10.id, (p) => ({ ...p, reflections: { 0: 'Water and trade.' } }));
    renderJournal();
    const entry = (await screen.findByText('Water and trade.')).closest('article')!;

    await user.click(within(entry).getByRole('button', { name: 'Edit' }));
    const textbox = await screen.findByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, 'Something else entirely.');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Water and trade.')).toBeInTheDocument();
    expect(screen.queryByText('Something else entirely.')).not.toBeInTheDocument();
    const [record] = await store.listProgress(learnerId);
    expect(record?.reflections[0]).toBe('Water and trade.');
  });
});
