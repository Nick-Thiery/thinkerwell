import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectServiceWorker, resetServiceWorkerForTests } from '../offline';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore } from '../storage';
import { mockSpeechRecognition, restoreSpeechMocks } from '../test/speechMocks';
import { SettingsPage } from './SettingsPage';

afterEach(async () => {
  restoreSpeechMocks();
  resetServiceWorkerForTests();
  delete (navigator as unknown as { connection?: unknown }).connection;
  await deleteAllData();
});

function renderSettings({ lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <SettingsPage />
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

const toggle = () => screen.getByRole('checkbox', { name: 'Allow online speech-to-text' });
const checkButton = () => screen.getByRole('button', { name: 'Check this device' });
const findCheckButton = () => screen.findByRole('button', { name: 'Check this device' });
const storedSettings = async () => (await getStore()).getSettings();

/** Lets anything the page started settle. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('SettingsPage: Say it', () => {
  it('has "Allow online speech-to-text" off by default, explained, and saves it on the device', async () => {
    const user = userEvent.setup();
    renderSettings();
    expect(screen.getByRole('heading', { level: 1, name: 'Settings for this device' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Say it: speech to text' })).toBeInTheDocument();
    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(toggle()).not.toBeChecked();
    expect(toggle()).toHaveAccessibleDescription(/families have agreed/);
    expect(screen.getByText(/recordings always stay on this device/)).toBeInTheDocument();

    await user.click(toggle());
    expect(toggle()).toBeChecked();
    const store = await getStore();
    await waitFor(async () => expect((await store.getSettings()).partner.allowOnlineDictation).toBe(true));
    await user.click(toggle());
    await waitFor(async () => expect((await store.getSettings()).partner.allowOnlineDictation).toBe(false));
  });

  it('saves it while looking around too: it sets up the device, not a learner', async () => {
    const user = userEvent.setup();
    renderSettings({ lookAround: true });
    await waitFor(() => expect(toggle()).toBeEnabled());
    await user.click(toggle());
    const store = await getStore();
    await waitFor(async () => expect((await store.getSettings()).partner.allowOnlineDictation).toBe(true));
  });

  it('says when the browser has no speech to text, with nothing to check', async () => {
    renderSettings();
    expect(await screen.findByText(/This browser can't turn speech into text, so Say it doesn't show/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check this device' })).not.toBeInTheDocument();
  });

  it("doesn't ask the browser as the page opens: it offers Check this device", async () => {
    const mock = mockSpeechRecognition({ availability: 'available' });
    renderSettings();
    expect(await screen.findByText(/This device hasn't been checked yet/)).toBeInTheDocument();
    expect(checkButton()).toHaveAccessibleDescription(/The check can take a moment/);
    await settle();
    expect(mock.available).not.toHaveBeenCalled();
    expect(mock.install).not.toHaveBeenCalled();
    expect(mock.instances).toHaveLength(0);
    expect((await storedSettings()).speechCheck).toBeNull();
  });

  it('checks once on a tap, says speech stays on the device, and saves that with the date', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition({ availability: 'available' });
    renderSettings();
    await user.click(await findCheckButton());
    expect(await screen.findByText(/What learners say is not sent anywhere/)).toBeInTheDocument();
    expect(mock.available).toHaveBeenCalledTimes(1);
    expect(mock.instances).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Download speech to text' })).not.toBeInTheDocument();
    await waitFor(async () => expect((await storedSettings()).speechCheck?.status).toBe('available'));
    const { checkedAt } = (await storedSettings()).speechCheck!;
    expect(Date.now() - new Date(checkedAt).getTime()).toBeLessThan(60_000);
    const today = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(checkedAt));
    expect(screen.getByText(new RegExp(`Checked on ${today}\\.`))).toBeInTheDocument();
  });

  it('shows the saved result and its date when the page opens, without asking again', async () => {
    const mock = mockSpeechRecognition({ availability: 'downloadable' });
    const store = await getStore();
    await store.updateSettings({ speechCheck: { status: 'available', checkedAt: '2026-09-28T12:00:00.000Z' } });
    renderSettings();
    expect(await screen.findByText(/What learners say is not sent anywhere\. Checked on September 28, 2026\./)).toBeInTheDocument();
    await settle();
    expect(mock.available).not.toHaveBeenCalled();
    expect(checkButton()).toBeInTheDocument();
  });

  it('says when it could only go online', async () => {
    const user = userEvent.setup();
    mockSpeechRecognition({ onDevice: false });
    renderSettings();
    await user.click(await findCheckButton());
    expect(await screen.findByText(/It can only do it by sending what learners say to an online service/)).toBeInTheDocument();
    await waitFor(async () => expect((await storedSettings()).speechCheck?.status).toBe('unsupported'));
  });

  it('saves the check while looking around too', async () => {
    const user = userEvent.setup();
    mockSpeechRecognition({ availability: 'downloading' });
    renderSettings({ lookAround: true });
    await user.click(await findCheckButton());
    expect(await screen.findByText(/The browser is getting what it needs/)).toBeInTheDocument();
    await waitFor(async () => expect((await storedSettings()).speechCheck?.status).toBe('downloading'));
  });

  it('offers the one-time download where the check found one, and saves the result', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition({ availability: 'downloadable' });
    renderSettings();
    await user.click(await findCheckButton());
    const download = await screen.findByRole('button', { name: 'Download speech to text' });
    expect(mock.install).not.toHaveBeenCalled();
    await waitFor(async () => expect((await storedSettings()).speechCheck?.status).toBe('downloadable'));
    mock.available.mockResolvedValue('available');
    await user.click(download);
    expect(mock.install).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/What learners say is not sent anywhere/)).toBeInTheDocument();
    await waitFor(async () => expect((await storedSettings()).speechCheck?.status).toBe('available'));
    expect(mock.instances).toHaveLength(0);
  });

  it('says when the download did not finish', async () => {
    const user = userEvent.setup();
    mockSpeechRecognition({ availability: 'downloadable', installResult: false });
    renderSettings();
    await user.click(await findCheckButton());
    await user.click(await screen.findByRole('button', { name: 'Download speech to text' }));
    expect(await screen.findByText(/The download didn't finish/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download speech to text' })).toBeInTheDocument();
    expect(checkButton()).toBeInTheDocument();
  });
});

const saveData = () => screen.getByRole('checkbox', { name: 'Save data' });

describe('SettingsPage: offline and data', () => {
  it('says when this browser can’t keep the lessons offline', () => {
    renderSettings();
    const card = screen.getByRole('region', { name: 'Offline and data' });
    expect(within(card).getByRole('status')).toHaveTextContent(/can't keep the lessons for offline use/);
  });

  it('says when every lesson is saved on this device', async () => {
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
    renderSettings();
    expect(screen.getByRole('region', { name: 'Offline and data' })).toHaveTextContent(
      'All 24 lessons are saved on this device, with their pictures.',
    );
    disconnect();
  });

  it('Save data is off by default, and saves the choice on the device', async () => {
    const user = userEvent.setup();
    renderSettings();
    await waitFor(() => expect(saveData()).toBeEnabled());
    expect(saveData()).not.toBeChecked();
    expect(saveData()).toHaveAccessibleDescription(/Turns the videos off/);
    await user.click(saveData());
    expect(saveData()).toBeChecked();
    await waitFor(async () => expect((await storedSettings()).saveData).toBe(true));
    await user.click(saveData());
    await waitFor(async () => expect((await storedSettings()).saveData).toBe(false));
  });

  it("follows the browser's data saver until someone chooses", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    renderSettings();
    await waitFor(() => expect(saveData()).toBeEnabled());
    expect(saveData()).toBeChecked();
    expect(saveData()).toHaveAccessibleDescription(/It's on because this device is set to save data/);
    expect((await storedSettings()).saveData).toBeNull();
    // Turning it off is a choice, and it wins over the browser's hint.
    await user.click(saveData());
    await waitFor(async () => expect((await storedSettings()).saveData).toBe(false));
    expect(saveData()).not.toBeChecked();
    expect(saveData()).not.toHaveAccessibleDescription(/because this device is set to save data/);
  });
});

describe('SettingsPage: reading and listening', () => {
  it('sets the reading level lessons open in', async () => {
    const user = userEvent.setup();
    renderSettings();
    const level = screen.getByRole('group', { name: 'Reading level' });
    await waitFor(() => expect(within(level).getByRole('button', { name: 'Standard' })).toBeEnabled());
    expect(within(level).getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
    expect(level).toHaveAccessibleDescription(/for anyone who hasn't chosen one yet/);
    await user.click(within(level).getByRole('button', { name: 'Simpler' }));
    expect(within(level).getByRole('button', { name: 'Simpler' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(async () => expect((await storedSettings()).preferredReadingLevel).toBe('simpler'));
  });

  it('sets the Listen speed, and says when this browser has no voice for Listen', async () => {
    const user = userEvent.setup();
    renderSettings({ lookAround: true });
    const speed = screen.getByRole('group', { name: 'Listen speed' });
    await waitFor(() => expect(within(speed).getByRole('button', { name: 'Slow' })).toBeEnabled());
    expect(within(speed).getByRole('button', { name: 'Normal' })).toHaveAttribute('aria-pressed', 'true');
    expect(speed).toHaveAccessibleDescription(/has no voice on this device/);
    await user.click(within(speed).getByRole('button', { name: 'Slow' }));
    await waitFor(async () => expect((await storedSettings()).listeningSpeed).toBe('slow'));
  });
});
