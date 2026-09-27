import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { getLesson, getLessonSection, type Lesson } from '../../../content';
import { LessonPlayerTestProvider, type LessonPlayerValue } from '../../../lesson';
import { DEFAULT_SETTINGS, emptyProgress, type DeviceSettings, type ReadingLevel } from '../../../storage';
import { fakeVoice, mockSpeechSynthesis, restoreSpeechMocks } from '../../../test/speechMocks';
import { sentenceRanges } from './readingPieces';
import { ReadStage } from './ReadStage';

const L10 = getLesson('towns-near-rivers') as Lesson;
const [S1, S2, S3] = L10.read.sections as [Lesson['read']['sections'][number], Lesson['read']['sections'][number], Lesson['read']['sections'][number]];

function sentences(text: string): string[] {
  return sentenceRanges(text).map((r) => text.slice(r.start, r.end));
}

let savedSettings: DeviceSettings = DEFAULT_SETTINGS;

function LocationProbe() {
  return <p data-testid="search">{useLocation().search}</p>;
}

function Harness({ level = 'standard' }: { level?: ReadingLevel }) {
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>(level);
  const [settings, setSettings] = useState<DeviceSettings>(DEFAULT_SETTINGS);
  const value: LessonPlayerValue = {
    lesson: L10,
    section: getLessonSection(L10),
    step: 'read',
    status: 'ready',
    mode: 'learner',
    saving: true,
    progress: emptyProgress('learner-1', L10.id),
    saveError: false,
    update: () => undefined,
    flush: () => Promise.resolve(),
    stageEvent: () => undefined,
    readingLevel,
    setReadingLevel,
    settings,
    setListeningSpeed: (listeningSpeed) =>
      setSettings((current) => {
        savedSettings = { ...current, listeningSpeed };
        return savedSettings;
      }),
    seedOwner: 'learner-1',
    goTo: () => undefined,
  };
  return (
    <LessonPlayerTestProvider value={value}>
      <ReadStage />
      <LocationProbe />
    </LessonPlayerTestProvider>
  );
}

function renderRead(search = '', level?: ReadingLevel) {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${L10.id}/read${search}`]}>
      <Harness level={level} />
    </MemoryRouter>,
  );
}

const listenTool = () => screen.getByRole('button', { name: 'Listen' });
const listenBar = () => screen.queryByRole('group', { name: /Reading aloud/ });
const marked = () => document.querySelector('mark.tw-speaking')?.textContent ?? null;
/** Every marked piece of the sentence, in order (a glossary word in it carries its own mark). */
const allMarked = () => Array.from(document.querySelectorAll('mark.tw-speaking'), (mark) => mark.textContent).join('');

afterEach(() => {
  restoreSpeechMocks();
  savedSettings = DEFAULT_SETTINGS;
});

describe('Listen', () => {
  it('is hidden where the browser has no speech', () => {
    renderRead();
    expect(screen.getByRole('toolbar', { name: 'Reading tools' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Listen' })).not.toBeInTheDocument();
  });

  it('is hidden when every English voice needs the internet', () => {
    mockSpeechSynthesis([fakeVoice('en-US', { local: false, name: 'Google US English' }), fakeVoice('fr-FR')]);
    renderRead();
    expect(screen.queryByRole('button', { name: 'Listen' })).not.toBeInTheDocument();
  });

  it('comes first in the reading tools and reads the part aloud, sentence by sentence, with a local voice', async () => {
    const user = userEvent.setup();
    const voice = fakeVoice('en-GB');
    const speech = mockSpeechSynthesis([fakeVoice('en-US', { local: false }), voice]);
    renderRead();
    const tools = within(screen.getByRole('toolbar', { name: 'Reading tools' })).getAllByRole('button');
    expect(tools[0]).toBe(listenTool());
    expect(listenTool()).toHaveAttribute('aria-pressed', 'false');
    expect(listenBar()).not.toBeInTheDocument();

    await user.click(listenTool());
    expect(listenTool()).toHaveAttribute('aria-pressed', 'true');
    expect(listenBar()).toHaveAccessibleName('Reading aloud · part 1 of 3');
    expect(speech.spoken[0]?.text).toBe(S1.heading);
    expect(speech.spoken[0]?.voice).toBe(voice);
    expect(marked()).toBeNull();

    const expected = sentences(S1.text);
    act(() => speech.finish());
    expect(speech.spoken[1]?.text).toBe(expected[0]);
    expect(marked()).toBe(expected[0]);
    expect(document.querySelectorAll('mark.tw-speaking')).toHaveLength(1);
    act(() => speech.finish());
    expect(marked()).toBe(expected[1]);
  });

  it('pauses, plays the same sentence again, and changes speed', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead();
    await user.click(listenTool());
    act(() => speech.finish());
    const first = sentences(S1.text)[0];

    await user.click(within(listenBar()!).getByRole('button', { name: 'Pause' }));
    expect(speech.cancel).toHaveBeenCalled();
    expect(within(listenBar()!).getByRole('button', { name: 'Play' })).toBeInTheDocument();
    const count = speech.spoken.length;
    await user.click(within(listenBar()!).getByRole('button', { name: 'Play' }));
    expect(speech.spoken).toHaveLength(count + 1);
    expect(speech.spoken.at(-1)?.text).toBe(first);
    expect(speech.spoken.at(-1)?.rate).toBe(1);

    await user.click(within(listenBar()!).getByRole('button', { name: 'Slow' }));
    expect(speech.spoken.at(-1)?.text).toBe(first);
    expect(speech.spoken.at(-1)?.rate).toBe(0.8);
    expect(savedSettings.listeningSpeed).toBe('slow');
    expect(within(listenBar()!).getByRole('button', { name: 'Slow' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Stop hides the bar and puts focus back on Listen', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead();
    await user.click(listenTool());
    act(() => speech.finish());
    await user.click(within(listenBar()!).getByRole('button', { name: 'Stop' }));
    expect(listenBar()).not.toBeInTheDocument();
    expect(marked()).toBeNull();
    expect(listenTool()).toHaveFocus();
    expect(listenTool()).toHaveAttribute('aria-pressed', 'false');
    // Late events from the cancelled sentence change nothing.
    speech.spoken.at(-1)?.onend?.({});
    expect(speech.spoken).toHaveLength(2);

    // Pressing Listen again while on also stops.
    await user.click(listenTool());
    await user.click(listenTool());
    expect(listenBar()).not.toBeInTheDocument();
  });

  it('reads the Simpler version when it is on, and starts the part again when the level changes', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead('', 'simpler');
    await user.click(listenTool());
    act(() => speech.finish());
    expect(marked()).toBe(sentences(S1.simpler)[0]);

    await user.click(within(screen.getByRole('group', { name: 'Reading level' })).getByRole('button', { name: 'Standard' }));
    expect(speech.spoken.at(-1)?.text).toBe(S1.heading);
    act(() => speech.finish());
    expect(marked()).toBe(sentences(S1.text)[0]);
  });

  it('moves on to the next part by itself without moving focus, and stops after the last part', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead('?part=2');
    await user.click(listenTool());
    const tool = listenTool();
    expect(tool).toHaveFocus();

    // The heading and every sentence of part 2.
    for (let i = 0; i <= sentences(S2.text).length; i += 1) act(() => speech.finish());
    expect(screen.getByTestId('search')).toHaveTextContent('?part=3');
    expect(screen.getByRole('heading', { name: S3.heading })).toBeInTheDocument();
    expect(speech.spoken.at(-1)?.text).toBe(S3.heading);
    expect(listenBar()).toHaveAccessibleName('Reading aloud · part 3 of 3');
    expect(tool).toHaveFocus();

    // Focus on Pause when the last part ends: it goes back to Listen, not to nowhere.
    within(listenBar()!).getByRole('button', { name: 'Pause' }).focus();
    for (let i = 0; i <= sentences(S3.text).length; i += 1) act(() => speech.finish());
    expect(listenBar()).not.toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?part=3');
    expect(listenTool()).toHaveFocus();
  });

  it('follows the learner to another part, reading it from its heading', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead();
    await user.click(listenTool());
    await user.click(screen.getByRole('button', { name: /Part 2/ }));
    expect(speech.spoken.at(-1)?.text).toBe(S2.heading);
    expect(listenBar()).toHaveAccessibleName('Reading aloud · part 2 of 3');
  });

  it('stops at the quick check and when the stage goes away', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    const view = renderRead('?part=3');
    await user.click(listenTool());
    speech.cancel.mockClear();
    await user.click(screen.getByRole('button', { name: /quick check/i }));
    expect(speech.cancel).toHaveBeenCalled();
    view.unmount();

    const again = renderRead();
    await user.click(listenTool());
    speech.cancel.mockClear();
    again.unmount();
    expect(speech.cancel).toHaveBeenCalled();
  });

  it('keeps an open definition open, with focus on its word, while the highlight reaches and passes it', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead();
    const all = sentences(S1.text);
    const withTerm = all.findIndex((sentence) => /\bfertile\b/.test(sentence));
    expect(withTerm).toBeGreaterThan(0);

    await user.click(listenTool());
    act(() => speech.finish()); // the heading: the first sentence is now marked
    const term = screen.getByRole('button', { name: 'fertile' });
    await user.click(term);
    expect(term).toHaveAttribute('aria-expanded', 'true');

    // On to the sentence with the word in it, then past it.
    for (let i = 0; i < withTerm; i += 1) act(() => speech.finish());
    // The sentence is marked around the word, and the word carries the mark inside its button.
    expect(allMarked()).toBe(all[withTerm]);
    expect(term.querySelector('mark.tw-speaking')).toHaveTextContent('fertile');
    expect(screen.getByRole('button', { name: 'fertile' })).toBe(term);
    expect(term).toHaveAttribute('aria-expanded', 'true');
    expect(term).toHaveFocus();

    act(() => speech.finish());
    expect(allMarked()).toBe(all[withTerm + 1]);
    expect(term.querySelector('mark')).toBeNull();
    expect(term.isConnected).toBe(true);
    expect(term).toHaveAttribute('aria-expanded', 'true');
    expect(term).toHaveFocus();
  });

  it('stops quietly if the voice fails', async () => {
    const user = userEvent.setup();
    const speech = mockSpeechSynthesis();
    renderRead();
    await user.click(listenTool());
    act(() => speech.fail());
    expect(listenBar()).not.toBeInTheDocument();
    expect(listenTool()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
