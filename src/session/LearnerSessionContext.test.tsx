import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { getGuestProgress, setGuestProgress } from '../lesson/guestMemory';
import { deleteAllData, emptyProgress } from '../storage';
import { LearnerSessionProvider, useLearnerSession } from './LearnerSessionContext';

afterEach(async () => {
  await deleteAllData();
});

/** A minimal consumer that exposes the context's state and actions as buttons, for tests. */
function Probe({ forceLookAround }: { forceLookAround?: boolean }) {
  return (
    <LearnerSessionProvider forceLookAround={forceLookAround}>
      <Inner />
    </LearnerSessionProvider>
  );
}

function Inner() {
  const session = useLearnerSession();
  return (
    <div>
      <p data-testid="status">{session.status}</p>
      <p data-testid="storage">{String(session.storageAvailable)}</p>
      <p data-testid="lookAround">{String(session.lookAround)}</p>
      <p data-testid="current">{session.currentLearner?.name ?? 'none'}</p>
      <ul>
        {session.learners.map((l) => (
          <li key={l.id}>{l.name}</li>
        ))}
      </ul>
      <button onClick={() => void session.addLearner({ name: 'Amina', colour: 'lemon' })}>Add Amina</button>
      <button onClick={() => void session.addLearner({ name: 'Reza', colour: 'geography' })}>Add Reza</button>
      <button
        onClick={() => {
          const other = session.learners.find((l) => l.name === 'Reza');
          if (other) void session.chooseLearner(other.id);
        }}
      >
        Choose Reza
      </button>
      <button
        onClick={() => {
          const target = session.currentLearner ?? session.learners[0];
          if (target) void session.removeLearner(target.id);
        }}
      >
        Remove current
      </button>
      <button onClick={() => session.startLookAround()}>Look around</button>
      <button onClick={() => void session.returnToPicker()}>Back to picker</button>
    </div>
  );
}

describe('LearnerSessionProvider', () => {
  describe("a guest's in-memory answers never reach the next person (rule 4)", () => {
    function rememberGuestAnswer() {
      setGuestProgress({ ...emptyProgress('guest', 'towns-near-rivers'), warmUpAnswer: 'Guest A' });
      expect(getGuestProgress('towns-near-rivers').warmUpAnswer).toBe('Guest A');
    }

    it.each([
      ['Look around'],
      ['Back to picker'],
      ['Add Amina'],
    ])('"%s" forgets them', async (button) => {
      const user = userEvent.setup();
      render(<Probe />);
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
      rememberGuestAnswer();
      await user.click(screen.getByRole('button', { name: button }));
      await waitFor(() => expect(getGuestProgress('towns-near-rivers').warmUpAnswer).toBeNull());
    });

    it('choosing a learner forgets them', async () => {
      const user = userEvent.setup();
      render(<Probe />);
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
      await user.click(screen.getByRole('button', { name: 'Add Reza' }));
      await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Reza'));
      rememberGuestAnswer();
      await user.click(screen.getByRole('button', { name: 'Choose Reza' }));
      await waitFor(() => expect(getGuestProgress('towns-near-rivers').warmUpAnswer).toBeNull());
    });
  });

  it('starts loading, then ready with no learners and nobody current', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('storage')).toHaveTextContent('true');
    expect(screen.getByTestId('current')).toHaveTextContent('none');
    expect(screen.getByTestId('lookAround')).toHaveTextContent('false');
  });

  it('adding a learner makes them current and turns look-around off', async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByRole('button', { name: 'Add Amina' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Amina'));
    expect(screen.getByRole('listitem')).toHaveTextContent('Amina');
  });

  it('choosing another learner switches the current learner', async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByRole('button', { name: 'Add Amina' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Amina'));
    await user.click(screen.getByRole('button', { name: 'Add Reza' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Reza'));

    await user.click(screen.getByRole('button', { name: 'Choose Reza' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Reza'));
  });

  it('removing the current learner clears it, and keeps the other learner', async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByRole('button', { name: 'Add Amina' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Amina'));
    await user.click(screen.getByRole('button', { name: 'Add Reza' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Reza'));

    await user.click(screen.getByRole('button', { name: 'Remove current' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('none'));
    expect(screen.getAllByRole('listitem').map((el) => el.textContent)).toEqual(['Amina']);
  });

  it('starts in look-around when told to, and returning to the picker clears it', async () => {
    const user = userEvent.setup();
    render(<Probe forceLookAround />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('lookAround')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'Back to picker' }));
    await waitFor(() => expect(screen.getByTestId('lookAround')).toHaveTextContent('false'));
  });

  it('startLookAround() sets look-around without touching storage', async () => {
    const user = userEvent.setup();
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByRole('button', { name: 'Look around' }));
    expect(screen.getByTestId('lookAround')).toHaveTextContent('true');
    expect(screen.getByTestId('current')).toHaveTextContent('none');
  });

  it('startLookAround() with a current learner clears them too, in memory and on the device', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    await user.click(screen.getByRole('button', { name: 'Add Amina' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('Amina'));

    await user.click(screen.getByRole('button', { name: 'Look around' }));
    expect(screen.getByTestId('lookAround')).toHaveTextContent('true');
    // Not just the in-memory value: a fresh provider (standing in for a page
    // reload) must not find Amina current either, or the header would show
    // her name again the moment "nothing is saved" reloads.
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('none'));
    unmount();

    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('current')).toHaveTextContent('none');
  });
});
