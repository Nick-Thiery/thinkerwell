import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findLocale, I18nProvider, type LoadedLocale } from '../../i18n';
import { connectServiceWorker, resetServiceWorkerForTests } from '../../offline';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { fakeVoice, mockSpeechRecognition, mockSpeechSynthesis, restoreSpeechMocks } from '../../test/speechMocks';
import { SetupPage } from './SetupPage';

type Nav = { storage?: unknown; standalone?: boolean };

function fakeStorage(persisted: boolean, grants: boolean) {
  const storage = {
    persisted: vi.fn(() => Promise.resolve(persisted)),
    persist: vi.fn(() => Promise.resolve(grants)),
  };
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true });
  return storage;
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  restoreSpeechMocks();
  resetServiceWorkerForTests();
  delete (navigator as unknown as Nav).storage;
  delete (navigator as unknown as Nav).standalone;
  await deleteAllData();
});

function renderSetup(loaded?: LoadedLocale) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <LearnerSessionProvider>
            <SetupPage />
          </LearnerSessionProvider>
        ),
      },
    ],
    { initialEntries: ['/educators/setup'] },
  );
  render(
    <I18nProvider loaded={loaded}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

// Dari with made-up messages for the home screen step, as a translation would have them. Fixtures, not translations.
const dari: LoadedLocale = {
  definition: { ...findLocale('fa-AF')!, ready: true },
  messages: {
    pages: {
      setup: {
        homeScreen: {
          title: 'FIXTURE home screen',
          why: { one: 'FIXTURE {count} day', other: 'FIXTURE {count} days' },
          desktop: { step1: 'FIXTURE step one' },
        },
      },
    },
  },
};

/** A step of the checklist, found by its title. */
function step(title: string): HTMLElement {
  return screen.getByRole('heading', { level: 2, name: new RegExp(title) }).closest('li')!;
}

async function settle() {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe('SetupPage', { timeout: 20_000 }, () => {
  it('lists the steps in order, the speech check last, with what to do after them', async () => {
    renderSetup();
    expect(screen.getByRole('heading', { level: 1, name: 'Set up this device' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Steps' });
    const titles = within(list)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual([
      '1Add Thinkerwell to the home screen',
      '2Download the course for offline use',
      '3Keep saved work safe',
      '4Add the learners who use this device',
      '5Choose the Listen voice (optional)',
      '6Check speech to text',
    ]);
    expect(within(step('Check speech to text')).getByText(/Do this step last\. On some tablets the check has closed the browser tab\./)).toBeInTheDocument();
    const later = screen.getByRole('region', { name: 'Before you reset this device or give it back' });
    expect(within(later).getByRole('link', { name: 'Save work to a file in Settings' })).toHaveAttribute('href', '/settings#move-work');
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the educators page' })).toHaveAttribute('href', '/educators');
    await settle();
  });

  it('shows whether the course is saved for offline use, as Settings says it', async () => {
    let disconnect: () => void = () => undefined;
    await act(async () => {
      disconnect = connectServiceWorker({
        workbox: {
          addEventListener: vi.fn(),
          register: () => Promise.resolve({ active: {} } as ServiceWorkerRegistration),
          update: () => Promise.resolve(),
          messageSkipWaiting: vi.fn(),
        },
        isControlled: () => true,
        reload: vi.fn(),
        isOnline: () => true,
        isVisible: () => true,
      });
      await Promise.resolve();
    });
    renderSetup();
    const status = within(step('Download the course')).getByRole('status');
    expect(status).toHaveTextContent('Done');
    expect(status).toHaveTextContent('All 24 lessons are saved on this device, with their pictures.');
    disconnect();
    await settle();
  });

  it('where the course can\'t be kept, says so', async () => {
    renderSetup();
    const status = within(step('Download the course')).getByRole('status');
    expect(status).toHaveTextContent('Not on this browser');
    expect(status).toHaveTextContent("This browser can't keep the lessons for offline use");
    await settle();
  });

  it('asks for persistent storage only when "Keep work safe" is tapped', async () => {
    const user = userEvent.setup();
    const storage = fakeStorage(false, true);
    renderSetup();
    const card = step('Keep saved work safe');
    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent('Not done yet'));
    expect(within(card).getByRole('status')).toHaveTextContent('The browser may delete saved work when space runs low.');
    expect(storage.persisted).toHaveBeenCalled();
    expect(storage.persist).not.toHaveBeenCalled();

    await user.click(within(card).getByRole('button', { name: 'Keep work safe' }));
    expect(storage.persist).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent('Done'));
    expect(within(card).getByRole('status')).toHaveTextContent('The browser keeps saved work on this device');
    expect(within(card).queryByRole('button', { name: 'Keep work safe' })).not.toBeInTheDocument();
  });

  it('says when the browser says no, and lets you ask again later', async () => {
    const user = userEvent.setup();
    const storage = fakeStorage(false, false);
    renderSetup();
    const card = step('Keep saved work safe');
    await user.click(await within(card).findByRole('button', { name: 'Keep work safe' }));
    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent('The browser said no for now.'));
    expect(within(card).getByRole('button', { name: 'Keep work safe' })).toBeInTheDocument();
    expect(storage.persist).toHaveBeenCalledTimes(1);
  });

  it('shows storage already kept as done, with no button', async () => {
    fakeStorage(true, true);
    renderSetup();
    const card = step('Keep saved work safe');
    await waitFor(() => expect(within(card).getByRole('status')).toHaveTextContent('Done'));
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });

  it('knows when Thinkerwell is open from the home screen', async () => {
    (navigator as unknown as Nav).standalone = true;
    renderSetup();
    const status = within(step('Add Thinkerwell to the home screen')).getByRole('status');
    expect(status).toHaveTextContent('Done');
    expect(status).toHaveTextContent('Thinkerwell is open from the home screen.');
    await settle();
  });

  it('shows the home screen steps for this device first, and the others behind a disclosure', async () => {
    renderSetup();
    const card = step('Add Thinkerwell to the home screen');
    // jsdom's user agent is neither Apple nor Android: the laptop steps.
    expect(within(card).getByRole('heading', { level: 3, name: 'Steps for this device: Windows laptop or Chromebook (Chrome or Edge)' })).toBeVisible();
    const others = card.querySelector('details')!;
    expect(others).not.toHaveAttribute('open');
    expect(within(others).getByText('Steps for other devices')).toBeInTheDocument();
    expect(within(others).getByRole('heading', { level: 3, name: 'iPad or iPhone (Safari)', hidden: true })).toBeInTheDocument();
    expect(within(others).getByRole('heading', { level: 3, name: 'Android tablet or phone (Chrome)', hidden: true })).toBeInTheDocument();
    expect(status(card)).toHaveTextContent('Thinkerwell is open in the browser.');
    await settle();
  });

  it("numbers the steps and the home screen steps, and writes the days, in the interface's language", async () => {
    renderSetup(dari);
    const card = step('FIXTURE home screen');
    expect(card.querySelector('.tw-setup-number')).toHaveTextContent('۱');
    expect(within(card).getByText('FIXTURE ۷ days')).toBeInTheDocument();
    const steps = within(card).getAllByRole('list')[0]!;
    const first = within(steps).getAllByRole('listitem')[0]!;
    expect(first.querySelector('.tw-setup-platform-number')).toHaveTextContent('۱');
    expect(first).toHaveTextContent('۱FIXTURE step one');
    expect(within(steps).getAllByRole('listitem')[4]!.querySelector('.tw-setup-platform-number')).toHaveTextContent('۵');
    await settle();
  });

  it('in English, says how many days Safari keeps work, and numbers the home screen steps', async () => {
    renderSetup();
    const card = step('Add Thinkerwell to the home screen');
    expect(within(card).getByText(/stops Safari deleting saved work after 7 days without a visit\.$/)).toBeInTheDocument();
    const steps = within(card).getAllByRole('list')[0]!;
    expect(within(steps).getAllByRole('listitem').map((item) => item.querySelector('.tw-setup-platform-number')!.textContent)).toEqual(['1', '2', '3', '4', '5']);
    await settle();
  });

  it('counts the learners on this device, and offers to add one', async () => {
    const store = await getStore();
    await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.addLearner({ name: 'Yusuf', colour: 'civics' });
    const router = renderSetup();
    const card = step('Add the learners');
    await waitFor(() => expect(status(card)).toHaveTextContent('2 learners on this device.'));
    expect(status(card)).toHaveTextContent('Done');
    expect(within(card).getByRole('link', { name: 'See the class' })).toHaveAttribute('href', '/educators/class');

    await userEvent.setup().click(within(card).getByRole('button', { name: 'Add a learner' }));
    await waitFor(() => expect(router.state.location.search).toBe('?new=1'));
    expect(router.state.location.pathname).toBe('/');
  });

  it('with nobody on the device, says so', async () => {
    renderSetup();
    const card = step('Add the learners');
    await waitFor(() => expect(status(card)).toHaveTextContent('No learners on this device yet.'));
    expect(status(card)).toHaveTextContent('Not done yet');
    expect(within(card).queryByRole('link', { name: 'See the class' })).not.toBeInTheDocument();
  });

  it('where this browser window has no storage, says so instead of offering to add learners', async () => {
    await deleteAllData();
    vi.stubGlobal('indexedDB', undefined);
    renderSetup();
    const learners = step('Add the learners');
    await waitFor(() => expect(status(learners)).toHaveTextContent("This browser window can't save learners' work at all."));
    expect(status(learners)).toHaveTextContent('Not on this browser');
    expect(within(learners).queryByRole('button')).not.toBeInTheDocument();
    expect(status(step('Keep saved work safe'))).toHaveTextContent('Not on this browser');
    expect(within(step('Keep saved work safe')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the saved speech check with its date, and never asks the browser', async () => {
    const mock = mockSpeechRecognition({ availability: 'available', prefixedToo: true });
    await (await getStore()).updateSettings({ speechCheck: { status: 'available', checkedAt: '2026-09-28T12:00:00.000Z' } });
    renderSetup();
    const card = step('Check speech to text');
    await waitFor(() => expect(status(card)).toHaveTextContent('Done'));
    expect(status(card)).toHaveTextContent('Checked on September 28, 2026. Speech to text works on this device');
    expect(within(card).getByRole('link', { name: 'Check it in Settings' })).toHaveAttribute('href', '/settings#say-it');
    await settle();
    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.install).not.toHaveBeenCalled();
    expect(mock.construct).not.toHaveBeenCalled();
  });

  it('says when speech to text has not been checked yet', async () => {
    mockSpeechRecognition({ availability: 'available' });
    renderSetup();
    const card = step('Check speech to text');
    await waitFor(() => expect(status(card)).toHaveTextContent('Not checked on this device yet.'));
    expect(status(card)).toHaveTextContent('Not done yet');
  });

  it('shows the voice Listen uses, which is optional, and links to Settings\' Listen voice', async () => {
    const speech = mockSpeechSynthesis([fakeVoice('en-US', { name: 'Albert', isDefault: true }), fakeVoice('en-GB', { name: 'Daniel', isDefault: true })]);
    renderSetup();
    const card = step('Choose the Listen voice');
    await waitFor(() => expect(status(card)).toHaveTextContent('Listen reads with Daniel, the best voice on this device.'));
    expect(status(card)).toHaveTextContent('Optional');
    expect(within(card).getByRole('link', { name: 'Choose it in Settings' })).toHaveAttribute('href', '/settings#listen-voice');
    expect(within(card).getByText('In Settings, under Listen voice, play a sample and choose the clearest voice.')).toBeInTheDocument();
    // Reading the voice list speaks nothing.
    expect(speech.spoken).toEqual([]);
  });

  it('counts a voice chosen in Settings as done', async () => {
    mockSpeechSynthesis([fakeVoice('en-GB', { name: 'Daniel' }), fakeVoice('en-AU', { name: 'Karen' })]);
    await (await getStore()).updateSettings({ listenVoices: { en: { name: 'Karen', voiceURI: 'Karen', lang: 'en-AU' } } });
    renderSetup();
    const card = step('Choose the Listen voice');
    await waitFor(() => expect(status(card)).toHaveTextContent('Listen reads with Karen, chosen in Settings.'));
    expect(status(card)).toHaveTextContent('Done');
  });

  it('says when the device has no voice Listen can use', async () => {
    renderSetup();
    const card = step('Choose the Listen voice');
    await waitFor(() => expect(status(card)).toHaveTextContent("This device has no voice that Listen can use, so Listen doesn't show."));
    expect(status(card)).toHaveTextContent('Not on this browser');
  });

  it('where the browser has no speech to text, there is nothing to check', async () => {
    renderSetup();
    const card = step('Check speech to text');
    await waitFor(() => expect(status(card)).toHaveTextContent('Not needed'));
    expect(status(card)).toHaveTextContent("This browser can't turn speech into text, so there's nothing to check.");
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
  });
});

function status(card: HTMLElement): HTMLElement {
  return within(card).getByRole('status');
}
