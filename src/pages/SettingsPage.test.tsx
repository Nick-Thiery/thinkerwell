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

  it('says when the browser has no speech to text', async () => {
    renderSettings();
    expect(await screen.findByText(/This browser can't turn speech into text, so Say it doesn't show/)).toBeInTheDocument();
  });

  it('says when speech stays on the device', async () => {
    mockSpeechRecognition({ availability: 'available' });
    renderSettings();
    expect(await screen.findByText(/What learners say is not sent anywhere/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download speech to text' })).not.toBeInTheDocument();
  });

  it('says when it could only go online', async () => {
    mockSpeechRecognition({ onDevice: false });
    renderSettings();
    expect(await screen.findByText(/It can only do it by sending what learners say to an online service/)).toBeInTheDocument();
  });

  it('offers the one-time download where the browser has one, and reports the result', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition({ availability: 'downloadable' });
    renderSettings();
    const download = await screen.findByRole('button', { name: 'Download speech to text' });
    expect(mock.install).not.toHaveBeenCalled();
    mock.available.mockResolvedValue('available');
    await user.click(download);
    expect(mock.install).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/What learners say is not sent anywhere/)).toBeInTheDocument();
  });

  it('says when the download did not finish', async () => {
    const user = userEvent.setup();
    mockSpeechRecognition({ availability: 'downloadable', installResult: false });
    renderSettings();
    await user.click(await screen.findByRole('button', { name: 'Download speech to text' }));
    expect(await screen.findByText(/The download didn't finish/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download speech to text' })).toBeInTheDocument();
  });
});

const saveData = () => screen.getByRole('checkbox', { name: 'Save data' });
const storedSettings = async () => (await getStore()).getSettings();

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
