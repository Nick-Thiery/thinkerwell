import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteAllData, getStore } from '../storage';
import { LearnerSessionProvider, useLearnerSession } from './LearnerSessionContext';
import { forgetPendingLanguage, readPendingLanguage, rememberPendingLanguage } from '../storage/pendingLanguage';

beforeEach(() => window.localStorage.clear());
afterEach(async () => {
  window.localStorage.clear();
  await deleteAllData();
});

/** "<status> <language>": ready once storage has answered (and a pending change was finished). */
function Language() {
  const { status, language } = useLearnerSession();
  return <p data-testid="language">{`${status} ${language}`}</p>;
}

describe('a language change the page went before saving', () => {
  it('is kept, and forgotten only for the change that was saved', () => {
    rememberPendingLanguage({ learnerId: 'a', code: 'id' });
    forgetPendingLanguage({ learnerId: 'a', code: 'en' });
    expect(readPendingLanguage()).toEqual({ learnerId: 'a', code: 'id' });
    forgetPendingLanguage({ learnerId: 'a', code: 'id' });
    expect(readPendingLanguage()).toBeNull();
  });

  it("is finished on the next load, for the learner it was for", async () => {
    const store = await getStore();
    const amina = await store.addLearner({ name: 'Amina', colour: 'lemon', language: 'id' });
    await store.setCurrentLearnerId(amina.id);
    rememberPendingLanguage({ learnerId: amina.id, code: 'en' });
    render(
      <LearnerSessionProvider>
        <Language />
      </LearnerSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('ready en'));
    expect((await store.getLearner(amina.id))?.language).toBe('en');
    expect(readPendingLanguage()).toBeNull();
  });

  it('is finished on the next load, for the device', async () => {
    rememberPendingLanguage({ learnerId: null, code: 'id' });
    render(
      <LearnerSessionProvider>
        <Language />
      </LearnerSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('language')).toHaveTextContent('ready id'));
    expect((await (await getStore()).getSettings()).language).toBe('id');
  });
});
