import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setRecordingsForTests } from '../audio/recordings';
import { connectServiceWorker, resetServiceWorkerForTests } from '../offline';
import { LearnerSessionProvider } from '../session';
import { deleteAllData, getStore } from '../storage';
import { fakeVoice, mockSpeechRecognition, mockSpeechSynthesis, restoreSpeechMocks } from '../test/speechMocks';
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

  it('can check the device again while a download is under way', async () => {
    const user = userEvent.setup();
    const mock = mockSpeechRecognition({ availability: 'downloadable' });
    mock.install.mockReturnValue(new Promise<never>(() => undefined));
    renderSettings();
    await user.click(await findCheckButton());
    await user.click(await screen.findByRole('button', { name: 'Download speech to text' }));
    expect(await screen.findByText(/The browser is getting what it needs/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download speech to text' })).not.toBeInTheDocument();
    mock.available.mockResolvedValue('available');
    await user.click(checkButton());
    expect(await screen.findByText(/What learners say is not sent anywhere/)).toBeInTheDocument();
    expect(mock.available).toHaveBeenCalledTimes(2);
    await waitFor(async () => expect((await storedSettings()).speechCheck?.status).toBe('available'));
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

describe('SettingsPage: Listen voice', () => {
  /** Safari on an iPad: Apple's identifiers, every voice "default", novelty and Eloquence voices first. */
  const ipad = () => [
    fakeVoice('en-US', { name: 'Albert', isDefault: true }),
    fakeVoice('en-US', { name: 'Eddy', isDefault: true }),
    fakeVoice('en-AU', { name: 'Karen', isDefault: true }),
    fakeVoice('en-GB', { name: 'Daniel', isDefault: true }),
    fakeVoice('en-US', { name: 'Samantha (Enhanced)', isDefault: true }),
    fakeVoice('en-US', { name: 'Google US English', local: false }),
    fakeVoice('fr-FR', { name: 'Thomas', isDefault: true }),
  ];
  const englishGroup = () => screen.getByRole('group', { name: 'Voice for English lessons' });
  const englishList = () => screen.getByRole('combobox', { name: 'Voice for English lessons' });
  const options = (select: HTMLElement) => within(select).getAllByRole('option').map((option) => option.textContent);

  it('offers the voices on this device, best first, never a novelty voice or one that needs the internet, with Automatic first', async () => {
    const speech = mockSpeechSynthesis(ipad());
    renderSettings();
    expect(screen.getByRole('heading', { level: 2, name: 'Listen voice' })).toBeInTheDocument();
    await waitFor(() => expect(englishList()).toBeEnabled());
    expect(options(englishList())).toEqual(['Automatic (best on this device)', 'Samantha (Enhanced)', 'Daniel', 'Karen', 'Eddy']);
    expect(englishList()).toHaveValue('');
    expect(englishList()).toHaveAccessibleDescription('Automatic uses Samantha (Enhanced) on this device.');
    // No Indonesian voice here, so no Indonesian list; and nothing spoken as the page opens.
    expect(screen.queryByRole('combobox', { name: 'Voice for Indonesian lessons' })).not.toBeInTheDocument();
    expect(speech.spoken).toEqual([]);
    expect(screen.getByRole('heading', { level: 3, name: 'Get a clearer voice' })).toBeInTheDocument();
    for (const device of ['iPad or iPhone', 'Android tablet or phone', 'Windows laptop', 'Chromebook']) {
      expect(screen.getByText(device)).toBeInTheDocument();
    }
  });

  it('saves the chosen voice for this device, even while looking around, and goes back to Automatic', async () => {
    const user = userEvent.setup();
    mockSpeechSynthesis(ipad());
    renderSettings({ lookAround: true });
    await waitFor(() => expect(englishList()).toBeEnabled());
    await user.selectOptions(englishList(), 'Karen');
    expect(within(englishList()).getByRole('option', { name: 'Karen' })).toHaveProperty('selected', true);
    await waitFor(async () => expect((await storedSettings()).listenVoices).toEqual({ en: { name: 'Karen', voiceURI: 'Karen', lang: 'en-AU' } }));
    expect(englishList()).not.toHaveAccessibleDescription(/Automatic uses/);

    await user.selectOptions(englishList(), 'Automatic (best on this device)');
    await waitFor(async () => expect((await storedSettings()).listenVoices).toEqual({}));
    expect(englishList()).toHaveValue('');
  });

  it('plays a sample only when tapped: the chosen voice, or the one Automatic uses, at the Listen speed', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis(ipad());
    await (await getStore()).updateSettings({ listeningSpeed: 'slow' });
    const view = renderSettings();
    await waitFor(() => expect(englishList()).toBeEnabled());
    const sample = within(englishGroup()).getByRole('button', { name: 'Play a sample' });

    await user.click(sample);
    expect(speech.spoken.map((u) => [u.text, u.voice?.name, u.lang, u.rate])).toEqual([
      ['This is the voice that reads the lessons aloud.', 'Samantha (Enhanced)', 'en-US', 0.8],
    ]);
    await user.selectOptions(englishList(), 'Daniel');
    await user.click(sample);
    expect(speech.spoken.at(-1)?.voice?.name).toBe('Daniel');
    // Another tap stops the sample before starting it again; leaving the page stops it too.
    expect(speech.cancel).toHaveBeenCalled();
    speech.cancel.mockClear();
    view.unmount();
    expect(speech.cancel).toHaveBeenCalledTimes(1);
  });

  it('has a list for Indonesian lessons where the device has an Indonesian voice, with an Indonesian sample', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis([...ipad(), fakeVoice('id-ID', { name: 'Damayanti', isDefault: true }), fakeVoice('id-ID', { name: 'Gadis Online', local: false })]);
    renderSettings();
    const indonesian = await screen.findByRole('combobox', { name: 'Voice for Indonesian lessons' });
    await waitFor(() => expect(indonesian).toBeEnabled());
    expect(options(indonesian)).toEqual(['Automatic (best on this device)', 'Damayanti']);
    await user.click(within(screen.getByRole('group', { name: 'Voice for Indonesian lessons' })).getByRole('button', { name: 'Play a sample' }));
    expect(speech.spoken.map((u) => [u.text, u.voice?.name])).toEqual([['Ini suara yang membacakan pelajaran.', 'Damayanti']]);
    await user.selectOptions(indonesian, 'Damayanti');
    await waitFor(async () => expect((await storedSettings()).listenVoices).toEqual({ id: { name: 'Damayanti', voiceURI: 'Damayanti', lang: 'id-ID' } }));
  });

  it("shows Automatic when the saved voice isn't on this device, without a word about it", async () => {
    mockSpeechSynthesis(ipad());
    await (await getStore()).updateSettings({ listenVoices: { en: { name: 'Zoe (Premium)', voiceURI: 'com.apple.voice.premium.en-US.Zoe', lang: 'en-US' } } });
    renderSettings();
    await waitFor(() => expect(englishList()).toBeEnabled());
    expect(englishList()).toHaveValue('');
    expect(englishList()).toHaveAccessibleDescription('Automatic uses Samantha (Enhanced) on this device.');
    expect(screen.queryByText(/Zoe/)).not.toBeInTheDocument();
  });

  it('adds the language to two voices with the same name', async () => {
    mockSpeechSynthesis([fakeVoice('en-GB', { name: 'Eddy' }), { ...fakeVoice('en-US', { name: 'Eddy' }), voiceURI: 'eddy-us' }]);
    renderSettings();
    await waitFor(() => expect(englishList()).toBeEnabled());
    expect(options(englishList())).toEqual(['Automatic (best on this device)', 'Eddy (en-GB)', 'Eddy (en-US)']);
  });

  it('says when this device has no English voice Listen can use, and how to get one', async () => {
    renderSettings();
    expect(await screen.findByText(/This device has no English voice that Listen can use/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/Next to Preferred engine, tap the settings button/)).toBeInTheDocument();
  });
});

describe('SettingsPage: parts with an address of their own', () => {
  it.each([
    ['listen-voice', 'Listen voice'],
    ['say-it', 'Say it: speech to text'],
    ['move-work', 'Move work to another device'],
  ])('/settings#%s scrolls to that part once the page has loaded, and moves focus to its heading', async (part, heading) => {
    const scrolled: Element[] = [];
    const scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this);
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true, writable: true });
    try {
      render(
        <MemoryRouter initialEntries={[`/settings#${part}`]}>
          <LearnerSessionProvider>
            <SettingsPage />
          </LearnerSessionProvider>
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: heading })).toHaveFocus());
      expect(scrolled.at(-1)).toHaveAttribute('id', part);
      expect(scrolled.at(-1)).toHaveAccessibleName(heading);
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });
});

describe('SettingsPage: lesson audio', () => {
  /** The course is kept offline here (a fake service worker that controls the page). */
  async function offlineReady(): Promise<() => void> {
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
    return disconnect;
  }

  /** An empty Cache API: nothing is on the device yet. */
  function emptyCaches() {
    const cache = { match: () => Promise.resolve(undefined), keys: () => Promise.resolve([]), put: vi.fn(() => Promise.resolve()) };
    vi.stubGlobal('caches', { open: () => Promise.resolve(cache), match: () => Promise.resolve(undefined) });
  }

  afterEach(() => vi.unstubAllGlobals());

  it('is not shown without recordings', () => {
    renderSettings();
    expect(screen.queryByRole('region', { name: 'Lesson audio' })).not.toBeInTheDocument();
  });

  it('says how big the recordings of the device’s lessons’ languages are, and offers them once the course is kept', async () => {
    setRecordingsForTests({ en: { timings: '/audio/en/t.json', files: 145, bytes: 18_900_000 }, id: { timings: '/audio/id/t.json', files: 145, bytes: 26_700_000 } });
    emptyCaches();
    const disconnect = await offlineReady();
    renderSettings();
    const part = await screen.findByRole('region', { name: 'Lesson audio' });
    // Nobody here uses Indonesian: only the English recordings.
    expect(part).toHaveTextContent('For English lessons: 19 MB in all.');
    expect(await within(part).findByText('None of it is on this device yet.')).toBeInTheDocument();
    expect(within(part).getByRole('button', { name: 'Download lesson audio' })).toBeEnabled();
    disconnect();
  });

  it('counts Bahasa Indonesia once the device or a learner uses it', async () => {
    setRecordingsForTests({ en: { timings: '/audio/en/t.json', files: 145, bytes: 18_900_000 }, id: { timings: '/audio/id/t.json', files: 145, bytes: 26_700_000 } });
    emptyCaches();
    await (await getStore()).updateSettings({ language: 'id' });
    renderSettings();
    const part = await screen.findByRole('region', { name: /Audio pelajaran|Lesson audio/ });
    await waitFor(() => expect(part).toHaveTextContent(/27 MB/));
  });

  it('waits for the course to be kept offline, and never downloads with Save data on', async () => {
    setRecordingsForTests({ en: { timings: '/audio/en/t.json', files: 145, bytes: 18_900_000 } });
    emptyCaches();
    const { unmount } = renderSettings();
    let part = await screen.findByRole('region', { name: 'Lesson audio' });
    // No service worker here: nothing can keep them.
    expect(part).toHaveTextContent("This browser can't keep lesson audio");
    unmount();

    const disconnect = await offlineReady();
    await (await getStore()).updateSettings({ saveData: true });
    renderSettings();
    part = await screen.findByRole('region', { name: 'Lesson audio' });
    await waitFor(() => expect(within(part).getByRole('button', { name: 'Download lesson audio' })).toBeDisabled());
    expect(part).toHaveTextContent('Save data is on, so nothing downloads from here.');
    disconnect();
  });
});
