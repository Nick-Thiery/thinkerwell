import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '../../app/routes';
import { I18nProvider } from '../../i18n';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';

// Justin's follow-up of 10 November 2026: a new profile lands on Home at "/",
// not in Lesson 1, and creating it records no lesson activity.

afterEach(async () => {
  await deleteAllData();
});

async function openNewForm() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  render(
    <I18nProvider>
      <LearnerSessionProvider>
        <RouterProvider router={router} />
      </LearnerSessionProvider>
    </I18nProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /I'm new here/ }));
  return { router, user };
}

describe('creating a profile', () => {
  it('says "Create profile", and no longer promises Lesson 1', async () => {
    await openNewForm();
    expect(await screen.findByRole('button', { name: 'Create profile' })).toBeInTheDocument();
    expect(screen.getByText('Then choose a course from your home page.')).toBeInTheDocument();
    expect(screen.queryByText(/You will start with/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start Lesson 1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/How can we find out about the past/)).not.toBeInTheDocument();
  });

  it('opens the new learner’s Home with the button, with one profile and no lesson record', async () => {
    const { router, user } = await openNewForm();
    await user.type(await screen.findByLabelText('First name or nickname'), 'Amina');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Hi Amina' })).toBeInTheDocument();
    expect(screen.getByText('0 of 73 lessons completed')).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.historyAction).not.toBe('PUSH');

    const store = await getStore();
    const learners = await store.listLearners();
    expect(learners).toHaveLength(1);
    expect(await store.listProgress(learners[0]!.id)).toEqual([]);
    expect(await store.getCurrentLearnerId()).toBe(learners[0]!.id);
  });

  it('does the same with the Enter key, and a second Enter makes no second profile', async () => {
    const { router, user } = await openNewForm();
    await user.type(await screen.findByLabelText('First name or nickname'), 'Bao{Enter}{Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hi Bao' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    const store = await getStore();
    await waitFor(async () => expect(await store.listLearners()).toHaveLength(1));
    expect(await store.listProgress((await store.listLearners())[0]!.id)).toEqual([]);
  });

  it('keeps the same profile and the empty start state when Home is opened again', async () => {
    const { user } = await openNewForm();
    await user.type(await screen.findByLabelText('First name or nickname'), 'Cleo');
    await user.click(screen.getByRole('button', { name: 'Create profile' }));
    await screen.findByRole('heading', { level: 1, name: 'Hi Cleo' });

    // A reload: a fresh app over the same saved data.
    document.body.innerHTML = '';
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(
      <I18nProvider>
        <LearnerSessionProvider>
          <RouterProvider router={router} />
        </LearnerSessionProvider>
      </I18nProvider>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Hi Cleo' })).toBeInTheDocument();
    expect(screen.getByText('0 of 73 lessons completed')).toBeInTheDocument();
  });
});
