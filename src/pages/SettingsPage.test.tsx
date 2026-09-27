import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore } from '../storage';
import { mockSpeechRecognition, restoreSpeechMocks } from '../test/speechMocks';
import { SettingsPage } from './SettingsPage';

afterEach(async () => {
  restoreSpeechMocks();
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
