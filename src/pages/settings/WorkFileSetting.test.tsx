import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deleteDB } from 'idb';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServiceWorkerForTests } from '../../offline';
import { LearnerSessionProvider } from '../../session';
import {
  buildWorkFile,
  deleteAllData,
  getStore,
  openStore,
  serialiseWorkFile,
  WORK_FILE_FORMAT,
  type Learner,
  type ThinkerwellStore,
} from '../../storage';
import { SettingsPage } from '../SettingsPage';

// "Move work to another device" on the Settings page. Another device is a
// second IndexedDB database here: work is saved there, carried as a File,
// and loaded into this one through the page.

let otherName: string;
let otherDevice: ThinkerwellStore;
/** URL's own static methods, put back after each test (jsdom has no object URLs of its own). */
const urlStatics: Record<string, unknown> = {
  createObjectURL: Reflect.get(URL, 'createObjectURL'),
  revokeObjectURL: Reflect.get(URL, 'revokeObjectURL'),
};

beforeEach(async () => {
  otherName = `other-device-${crypto.randomUUID()}`;
  otherDevice = await openStore(otherName);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.assign(URL, urlStatics);
  otherDevice.close();
  await deleteDB(otherName);
  resetServiceWorkerForTests();
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

const card = () => screen.getByRole('region', { name: 'Move work to another device' });
const fileInput = () => card().querySelector<HTMLInputElement>('input[type="file"]')!;
const loadButton = () => within(card()).getByRole('button', { name: 'Load my work' });

async function nextMillisecond(): Promise<void> {
  const start = Date.now();
  while (Date.now() === start) await new Promise((resolve) => setTimeout(resolve, 1));
}

/** A learner on the other device, with work in some lessons and section checks. */
async function learnerWithWork(store: ThinkerwellStore, name: string, lessons: string[], checks = 0): Promise<Learner> {
  // Learners are listed oldest first. Two added in the same millisecond have
  // the same createdAt and come out in random order (by their random ids),
  // which made "Amina, Yusuf" flaky on fast machines. Wait for the clock to
  // move on, so each learner here is newer than the one before.
  await nextMillisecond();
  const learner = await store.addLearner({ name, colour: 'civics' });
  for (const lessonId of lessons) {
    await store.updateProgress(learner.id, lessonId, (p) => ({
      ...p,
      stagesDone: ['read', 'write'],
      writing: { ...p.writing, text: `${name} wrote about ${lessonId}.` },
    }));
  }
  const sections = ['history', 'geography', 'culture', 'civics'] as const;
  for (const sectionId of sections.slice(0, checks)) {
    await store.recordQuizAttempt(learner.id, sectionId, { answers: {}, score: 6, total: 10, finishedAt: new Date().toISOString() });
  }
  return learner;
}

async function fileFrom(store: ThinkerwellStore, name = 'thinkerwell-all-learners-2026-09-28.json'): Promise<File> {
  const text = serialiseWorkFile(buildWorkFile(await store.exportWork(), new Date('2026-09-28T09:00:00.000Z')));
  return new File([text], name, { type: 'application/json' });
}

const jsonFile = (value: unknown, name = 'thinkerwell-amina.json') =>
  new File([typeof value === 'string' ? value : JSON.stringify(value)], name, { type: 'application/json' });

/** Every learner and their lesson records on this device. */
async function thisDevice() {
  const store = await getStore();
  const learners = await store.listLearners();
  return Promise.all(learners.map(async (learner) => ({ learner, progress: await store.listProgress(learner.id) })));
}

async function choose(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(fileInput(), file);
}

describe('SettingsPage: saving work to a file', () => {
  it('says there is nothing to save on a device with no learners, and still offers loading', async () => {
    renderSettings({ lookAround: true });
    expect(await within(card()).findByText("There's no saved work on this device yet.")).toBeInTheDocument();
    expect(within(card()).queryByRole('button', { name: 'Save my work to a file' })).not.toBeInTheDocument();
    expect(loadButton()).toBeEnabled();
    expect(fileInput()).toHaveAttribute('accept', '.json,application/json');
  });

  it("offers each learner and everyone, starts on whoever is learning, and downloads that learner's file", async () => {
    const user = userEvent.setup();
    const store = await getStore();
    const amina = await learnerWithWork(store, 'Amina', ['towns-near-rivers'], 1);
    await store.saveRecording(amina.id, 'towns-near-rivers', new Blob(['clip'], { type: 'audio/webm' }), 1000);
    await learnerWithWork(store, 'Yusuf', []);
    await store.setCurrentLearnerId(amina.id);

    const blobs: Blob[] = [];
    Object.assign(URL, {
      createObjectURL: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return 'blob:thinkerwell/file';
      }),
      revokeObjectURL: vi.fn(),
    });
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });

    renderSettings();
    const who = await within(card()).findByRole('group', { name: 'Whose work' });
    expect(within(who).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toHaveLength(3);
    expect(within(who).getByRole('radio', { name: 'Amina' })).toBeChecked();
    expect(within(who).getByRole('radio', { name: 'All learners on this device' })).not.toBeChecked();
    const save = within(card()).getByRole('button', { name: 'Save my work to a file' });
    expect(save).toHaveAccessibleDescription(/Anyone with the file can read the work in it/);
    expect(within(card()).getByText('Recordings stay on this device.')).toBeInTheDocument();

    await user.click(save);
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(await within(card()).findByText(`Look for thinkerwell-amina-${day}.json in this device's downloads.`)).toBeInTheDocument();
    expect(downloads).toEqual([`thinkerwell-amina-${day}.json`]);

    const file = JSON.parse(await blobs[0]!.text()) as { format: string; version: number; savedAt: string; learners: Array<{ learner: Learner; progress: unknown[]; quizAttempts: unknown[] }> };
    expect(file.format).toBe(WORK_FILE_FORMAT);
    expect(file.version).toBe(1);
    expect(file.learners.map((work) => work.learner.name)).toEqual(['Amina']);
    expect(file.learners[0]!.progress).toHaveLength(1);
    expect(file.learners[0]!.quizAttempts).toHaveLength(1);
    expect(JSON.stringify(file)).not.toMatch(/audio|recording|saveData|speechCheck/);

    // Everyone, in one file.
    await user.click(within(who).getByRole('radio', { name: 'All learners on this device' }));
    await user.click(save);
    expect(await within(card()).findByText(`Look for thinkerwell-all-learners-${day}.json in this device's downloads.`)).toBeInTheDocument();
    const all = JSON.parse(await blobs[1]!.text()) as { learners: Array<{ learner: Learner }> };
    expect(all.learners.map((work) => work.learner.name)).toEqual(['Amina', 'Yusuf']);
  });

  it('starts on everyone while looking around', async () => {
    const store = await getStore();
    await learnerWithWork(store, 'Amina', []);
    renderSettings({ lookAround: true });
    expect(await within(card()).findByRole('radio', { name: 'All learners on this device' })).toBeChecked();
  });

  it('says so when this browser window has no storage', async () => {
    await deleteAllData();
    vi.stubGlobal('indexedDB', undefined);
    renderSettings();
    expect(await within(card()).findByText(/This browser window can't keep learners' work/)).toBeInTheDocument();
    expect(within(card()).queryByRole('button', { name: 'Load my work' })).not.toBeInTheDocument();
  });
});

describe('SettingsPage: loading work from a file', () => {
  it('shows what the file holds and changes nothing until "Load it"', async () => {
    const user = userEvent.setup();
    await learnerWithWork(otherDevice, 'Amina', ['towns-near-rivers', 'finding-out-about-the-past', 'objects-and-people'], 2);
    await learnerWithWork(otherDevice, 'Yusuf', ['towns-near-rivers']);
    renderSettings();
    await choose(user, await fileFrom(otherDevice));

    const preview = await screen.findByRole('group', { name: 'Check before you load' });
    expect(preview).toHaveTextContent('This file was saved on September 28, 2026. It has work for:');
    const items = within(preview).getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      'Amina: 3 lessons and 2 section checks. New on this device.',
      'Yusuf: 1 lesson. New on this device.',
    ]);
    await waitFor(() => expect(within(preview).getByRole('heading', { name: 'Check before you load' })).toHaveFocus());
    expect(await thisDevice()).toEqual([]);

    await user.click(within(preview).getByRole('button', { name: 'Load it' }));
    expect(await within(card()).findByText('Added to this device: Amina and Yusuf.')).toBeInTheDocument();
    expect(within(card()).getByText("To carry on, choose who's learning on the home page.")).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Check before you load' })).not.toBeInTheDocument();
    const loaded = await thisDevice();
    expect(loaded.map((entry) => [entry.learner.name, entry.progress.length])).toEqual([
      ['Amina', 3],
      ['Yusuf', 1],
    ]);
    // The session knows about them too: they can be chosen to save again straight away.
    expect(await within(card()).findByRole('radio', { name: 'Yusuf' })).toBeInTheDocument();
  });

  it('Cancel changes nothing and goes back to "Load my work"', async () => {
    const user = userEvent.setup();
    await learnerWithWork(otherDevice, 'Amina', ['towns-near-rivers']);
    renderSettings();
    await choose(user, await fileFrom(otherDevice));
    const preview = await screen.findByRole('group', { name: 'Check before you load' });
    await user.click(within(preview).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: 'Check before you load' })).not.toBeInTheDocument();
    await waitFor(() => expect(loadButton()).toHaveFocus());
    expect(await thisDevice()).toEqual([]);
  });

  it('says when a learner is already here, and when a different learner has the same name', async () => {
    const user = userEvent.setup();
    const store = await getStore();
    // Yusuf came from the other device before; this device also has its own Amina.
    const yusuf = await learnerWithWork(otherDevice, 'Yusuf', ['towns-near-rivers']);
    await store.importWork(await otherDevice.exportWork([yusuf.id]));
    await store.addLearner({ name: 'amina', colour: 'lemon' });
    await otherDevice.updateProgress(yusuf.id, 'objects-and-people', (p) => ({ ...p, stagesDone: ['read'] }));
    await learnerWithWork(otherDevice, 'Amina', []);

    renderSettings();
    await choose(user, await fileFrom(otherDevice));
    const preview = await screen.findByRole('group', { name: 'Check before you load' });
    // Both learners on the other device can be made in the same millisecond, so their order isn't fixed.
    expect(within(preview).getAllByRole('listitem').map((item) => item.textContent).sort()).toEqual([
      "Amina: no work yet. New on this device. There's already a different Amina on this device. Both are kept, and each tile shows the day it was added.",
      'Yusuf: 2 lessons. Already on this device, so this is added to their work here. Nothing is lost.',
    ]);
    await user.click(within(preview).getByRole('button', { name: 'Load it' }));
    expect(await within(card()).findByText('Added to this device: Amina.')).toBeInTheDocument();
    expect(within(card()).getByText('Added to the work already here: Yusuf.')).toBeInTheDocument();
    const names = (await thisDevice()).map((entry) => entry.learner.name).sort();
    expect(names).toEqual(['Amina', 'Yusuf', 'amina']);
    // Two learners called Amina: the save list tells them apart by the day each was added.
    const who = within(card()).getByRole('group', { name: 'Whose work' });
    expect(within(who).getAllByRole('radio', { name: /^amina, added /i })).toHaveLength(2);
  });

  it('says nothing changed when the same file is loaded twice', async () => {
    const user = userEvent.setup();
    await learnerWithWork(otherDevice, 'Amina', ['towns-near-rivers'], 1);
    const file = await fileFrom(otherDevice);
    renderSettings();
    await choose(user, file);
    await user.click(await screen.findByRole('button', { name: 'Load it' }));
    expect(await within(card()).findByText('Added to this device: Amina.')).toBeInTheDocument();
    const afterFirst = await thisDevice();

    await choose(user, file);
    await user.click(await screen.findByRole('button', { name: 'Load it' }));
    expect(await within(card()).findByText('This device already had all the work in this file, so nothing changed.')).toBeInTheDocument();
    expect(await thisDevice()).toEqual(afterFirst);
  });

  it('says how many pieces of work are for lessons this version does not have', async () => {
    const user = userEvent.setup();
    await learnerWithWork(otherDevice, 'Amina', ['towns-near-rivers', 'a-lesson-from-a-later-version', 'another-new-lesson']);
    renderSettings();
    await choose(user, await fileFrom(otherDevice));
    const preview = await screen.findByRole('group', { name: 'Check before you load' });
    expect(within(preview).getByRole('listitem')).toHaveTextContent('Amina: 1 lesson. New on this device.');
    expect(preview).toHaveTextContent(
      "2 pieces of work are for lessons or checks that this version of Thinkerwell doesn't have. They will be left out.",
    );
    await user.click(within(preview).getByRole('button', { name: 'Load it' }));
    await within(card()).findByText('Added to this device: Amina.');
    expect((await thisDevice())[0]!.progress.map((p) => p.lessonId)).toEqual(['towns-near-rivers']);
  });

  it.each([
    ['text that is not JSON', jsonFile('Dear diary, today we learned about rivers.'), "This isn't a Thinkerwell work file"],
    ['JSON from something else', jsonFile({ name: 'Amina', score: 10 }), "This isn't a Thinkerwell work file"],
    ['a newer version', jsonFile({ format: WORK_FILE_FORMAT, version: 2, learners: [] }), 'This file was saved by a newer version of Thinkerwell. Update this device first'],
    ['no learners', jsonFile({ format: WORK_FILE_FORMAT, version: 1, savedAt: '2026-09-28T09:00:00.000Z', learners: [] }), "There's no work in this file"],
    ['an empty file', jsonFile(''), "There's no work in this file"],
    [
      'a damaged record',
      jsonFile({ format: WORK_FILE_FORMAT, version: 1, savedAt: '2026-09-28T09:00:00.000Z', learners: [{ learner: { id: 'x', name: 'Amina' } }] }),
      'Part of this file is damaged, so nothing was loaded',
    ],
  ])('refuses %s, says why, and changes nothing', async (_what, file, message) => {
    const user = userEvent.setup();
    const store = await getStore();
    await store.addLearner({ name: 'Omar', colour: 'lemon' });
    const before = await thisDevice();
    renderSettings();
    await choose(user, file);
    const problem = await within(card()).findByText(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    expect(problem.closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('group', { name: 'Check before you load' })).not.toBeInTheDocument();
    expect(await thisDevice()).toEqual(before);
    // The page still works: another file can be chosen.
    expect(loadButton()).toBeEnabled();
  });

  it('refuses a file over 5 MB without reading it', async () => {
    const user = userEvent.setup();
    const big = jsonFile('{}');
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    const text = vi.spyOn(big, 'text');
    renderSettings();
    await choose(user, big);
    expect(await within(card()).findByText(/This file is too big to be Thinkerwell work/)).toBeInTheDocument();
    expect(text).not.toHaveBeenCalled();
  });

  it("says when a file can't be opened", async () => {
    const user = userEvent.setup();
    const file = jsonFile('{}');
    vi.spyOn(file, 'text').mockRejectedValue(new DOMException('Gone', 'NotReadableError'));
    renderSettings();
    await choose(user, file);
    expect(await within(card()).findByText("This file couldn't be opened. Try again.")).toBeInTheDocument();
  });

  it('says so and keeps the preview when writing fails, with nothing changed', async () => {
    const user = userEvent.setup();
    await learnerWithWork(otherDevice, 'Amina', ['towns-near-rivers']);
    renderSettings();
    await choose(user, await fileFrom(otherDevice));
    const preview = await screen.findByRole('group', { name: 'Check before you load' });
    const store = await getStore();
    vi.spyOn(store, 'importWork').mockRejectedValue(new DOMException('Disk full', 'QuotaExceededError'));
    await user.click(within(preview).getByRole('button', { name: 'Load it' }));
    expect(await within(card()).findByText('The work couldn\'t be loaded, so nothing changed on this device. Try again.')).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: 'Load it' })).toBeEnabled();
    expect(await thisDevice()).toEqual([]);
  });

  it('shows names from a file as text, never as markup', async () => {
    const user = userEvent.setup();
    const file = buildWorkFile(
      [{ learner: { id: 'abc-123', name: '<img src=x onerror=alert(1)>', colour: 'lemon', createdAt: '2026-09-01T08:00:00.000Z' }, progress: [], quizAttempts: [] }],
      new Date('2026-09-28T09:00:00.000Z'),
    );
    renderSettings();
    await choose(user, jsonFile(file));
    const preview = await screen.findByRole('group', { name: 'Check before you load' });
    expect(within(preview).getByRole('listitem')).toHaveTextContent('<img src=x onerror=alert(1)>: no work yet. New on this device.');
    expect(preview.querySelector('img')).toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
});
