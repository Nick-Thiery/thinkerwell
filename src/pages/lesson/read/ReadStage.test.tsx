import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLesson, getLessons, getLessonSection, getVisualUrl, type ChoiceCheck, type Lesson } from '../../../content';
import {
  applyStageEvent,
  checkSeed,
  glossaryEntriesIn,
  LessonPlayerProvider,
  LessonPlayerTestProvider,
  seededShuffle,
  type LessonPlayerValue,
  type StageEvent,
  type UpdateOptions,
} from '../../../lesson';
import { LearnerSessionProvider } from '../../../session';
import {
  DEFAULT_SETTINGS,
  deleteAllData,
  emptyProgress,
  getStore,
  type LessonProgress,
  type ReadingLevel,
} from '../../../storage';
import { ReadStage } from './ReadStage';

const L10 = getLesson('towns-near-rivers') as Lesson;

interface Spies {
  update: (options: UpdateOptions | undefined) => void;
  stageEvent: (event: StageEvent) => void;
  setReadingLevel: (level: ReadingLevel) => void;
  goTo: (step: string) => void;
}

function makeSpies(): Spies {
  return { update: vi.fn(), stageEvent: vi.fn(), setReadingLevel: vi.fn(), goTo: vi.fn() };
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="search">{location.search}</p>;
}

let latestProgress: LessonProgress | null = null;

function Harness({
  lesson,
  spies,
  initial,
  level = 'standard',
  seedOwner = 'learner-1',
}: {
  lesson: Lesson;
  spies: Spies;
  initial?: LessonProgress;
  level?: ReadingLevel;
  seedOwner?: string;
}) {
  const [progress, setProgress] = useState<LessonProgress>(initial ?? emptyProgress('learner-1', lesson.id));
  const [readingLevel, setLevel] = useState<ReadingLevel>(level);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    latestProgress = progress;
  }, [progress]);
  const value: LessonPlayerValue = {
    lesson,
    section: getLessonSection(lesson),
    step: 'read',
    status: 'ready',
    mode: 'learner',
    saving: true,
    progress,
    saveError: false,
    update: (change, options) => {
      spies.update(options);
      setProgress((p) => change(p));
    },
    flush: () => Promise.resolve(),
    stageEvent: (event) => {
      spies.stageEvent(event);
      setProgress((p) => applyStageEvent(lesson, p, event, '2026-01-01T00:00:00.000Z'));
    },
    readingLevel,
    setReadingLevel: (next) => {
      spies.setReadingLevel(next);
      setLevel(next);
    },
    settings,
    setListeningSpeed: (listeningSpeed) => setSettings((current) => ({ ...current, listeningSpeed })),
    seedOwner,
    goTo: (step) => spies.goTo(step),
  };
  return (
    <LessonPlayerTestProvider value={value}>
      <ReadStage />
      <LocationProbe />
    </LessonPlayerTestProvider>
  );
}

function renderRead(
  options: { lesson?: Lesson; search?: string; initial?: LessonProgress; level?: ReadingLevel; seedOwner?: string } = {},
) {
  const lesson = options.lesson ?? L10;
  const spies = makeSpies();
  const view = render(
    <MemoryRouter initialEntries={[`/lesson/${lesson.id}/read${options.search ?? ''}`]}>
      <Harness
        lesson={lesson}
        spies={spies}
        initial={options.initial}
        level={options.level}
        seedOwner={options.seedOwner}
      />
    </MemoryRouter>,
  );
  return { spies, view, lesson };
}

function termButtons(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.tw-reading .tw-term')];
}

function readingText(): string {
  return document.querySelector('.tw-reading-text')?.textContent ?? '';
}

afterEach(() => {
  latestProgress = null;
});

describe('ReadStage: reading parts', () => {
  it('marks glossary words on their first appearance only, in the standard version', () => {
    renderRead();
    const terms = termButtons().map((b) => b.textContent);
    // Part 1 has "fertile" twice and "floods" once; each entry is marked once.
    expect(terms).toEqual(['floods', 'fertile', 'crops', 'settlements']);
    expect(readingText()).toBe(L10.read.sections[0]!.text);
  });

  it('marks glossary words in the simpler version too, and the level switch changes the text', async () => {
    const user = userEvent.setup();
    const { spies } = renderRead();
    await user.click(screen.getByRole('button', { name: 'Simpler' }));
    expect(spies.setReadingLevel).toHaveBeenCalledWith('simpler');
    expect(screen.getByRole('button', { name: 'Simpler' })).toHaveAttribute('aria-pressed', 'true');
    expect(readingText()).toBe(L10.read.sections[0]!.simpler);
    expect(screen.getByText('Read · 1 of 3 · Simpler English')).toBeInTheDocument();
    const expected = glossaryEntriesIn(L10.read.sections[0]!.simpler, L10.read.glossary);
    expect(termButtons()).toHaveLength(expected.length);
    expect(termButtons().map((b) => b.textContent)).toEqual(['floods', 'fertile', 'Crops', 'settlements']);
  });

  it('opens a definition from a glossary word', async () => {
    const user = userEvent.setup();
    renderRead();
    await user.click(screen.getByRole('button', { name: 'fertile' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Good for growing lots of plants and food.');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves between parts through the URL, keeping other parameters, and focuses the new heading', async () => {
    const user = userEvent.setup();
    renderRead({ search: '?preview=true' });
    expect(screen.queryByRole('button', { name: /^Part / })).not.toBeInTheDocument(); // no Back on part 1
    await user.click(screen.getByRole('button', { name: 'Next: Part 2' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?preview=true&part=2');
    const heading = screen.getByRole('heading', { name: L10.read.sections[1]!.heading });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Read · 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Part 1' }));
    expect(screen.getByTestId('search')).toHaveTextContent('part=1');
    expect(screen.getByRole('heading', { name: L10.read.sections[0]!.heading })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next: Part 2' }));
    await user.click(screen.getByRole('button', { name: 'Next: Part 3' }));
    await user.click(screen.getByRole('button', { name: 'Next: Quick check' }));
    expect(screen.getByTestId('search')).toHaveTextContent('part=check');
    expect(screen.getByRole('heading', { level: 2, name: 'Quick check' })).toHaveFocus();
    // The warm-up and the reading are not on the quick check.
    expect(screen.queryByText(L10.warmUp.question, { exact: false })).not.toBeInTheDocument();
    expect(document.querySelector('.tw-reading')).toBeNull();

    // Back from the quick check goes to the last part, and says so.
    await user.click(screen.getByRole('button', { name: 'Part 3' }));
    expect(screen.getByTestId('search')).toHaveTextContent('part=3');
  });

  it('opens on the part in the URL, and on part 1 when it is missing or invalid', () => {
    renderRead({ search: '?part=3' });
    expect(screen.getByRole('heading', { name: L10.read.sections[2]!.heading })).toBeInTheDocument();
    cleanup();
    renderRead({ search: '?part=9' });
    expect(screen.getByRole('heading', { name: L10.read.sections[0]!.heading })).toBeInTheDocument();
    cleanup();
    renderRead({ search: '?part=nope' });
    expect(screen.getByRole('heading', { name: L10.read.sections[0]!.heading })).toBeInTheDocument();
  });

  it("shows the lesson's picture after the warm-up, next to the evidence and before the reading", () => {
    renderRead();
    const img = screen.getByRole('img', { name: L10.visual!.alt });
    expect(img).toHaveAttribute('src', getVisualUrl(L10.visual!.src));
    const warmUp = screen.getByText(L10.warmUp.question, { exact: false });
    const evidence = screen.getByRole('region', { name: 'Evidence' });
    const reading = document.querySelector('.tw-reading')!;
    expect(evidence).toContainElement(img);
    expect(warmUp.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(img.compareDocumentPosition(within(evidence).getByText(L10.evidence.question)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(img.compareDocumentPosition(reading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The team-only description never reaches learners.
    expect(document.body.textContent).not.toContain(L10.visual!.description);
  });

  it('shows the key words panel with every glossary word', async () => {
    const user = userEvent.setup();
    renderRead();
    const toggle = screen.getByRole('button', { name: 'Key words' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const panel = screen.getByRole('region', { name: 'Key words in this lesson' });
    expect(toggle).toHaveAttribute('aria-controls', panel.id);
    const items = within(panel).getAllByRole('listitem');
    expect(items).toHaveLength(L10.read.glossary.length);
    for (const entry of L10.read.glossary) {
      expect(within(panel).getByText(entry.definition)).toBeInTheDocument();
    }
    await user.click(toggle);
    expect(screen.queryByRole('region', { name: 'Key words in this lesson' })).not.toBeInTheDocument();
  });

  it('shows the glossary helper on parts with glossary words', () => {
    renderRead();
    expect(screen.getByText('Tap a coloured word to see what it means.')).toBeInTheDocument();
  });
});

describe('ReadStage: warm-up', () => {
  it('saves the chosen option at once, and tapping it again keeps it chosen', async () => {
    const user = userEvent.setup();
    const { spies } = renderRead();
    const group = screen.getByRole('radiogroup', { name: 'Your first idea' });
    const chip = within(group).getByRole('radio', { name: 'On the hill' });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-checked', 'true');
    expect(latestProgress?.warmUpAnswer).toBe('On the hill');
    expect(spies.update).toHaveBeenCalledWith({ immediate: true });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-checked', 'true');
    expect(spies.update).toHaveBeenCalledTimes(1);
  });

  it('uses a writing box when the warm-up has no options', async () => {
    const user = userEvent.setup();
    const lesson: Lesson = { ...L10, warmUp: { question: 'What do you think?' } };
    renderRead({ lesson });
    const box = screen.getByRole('textbox', { name: 'Your first idea' });
    await user.type(box, 'Rivers');
    expect(latestProgress?.warmUpAnswer).toBe('Rivers');
  });
});

describe('ReadStage: quick check', () => {
  const q0 = L10.read.checks[0] as ChoiceCheck;

  function optionsOf(questionIndex: number): string[] {
    const groups = screen.getAllByRole('radiogroup');
    return within(groups[questionIndex]!)
      .getAllByRole('radio')
      .map((radio) => radio.querySelector('.tw-option-text')?.textContent ?? '');
  }

  it('shuffles options in the same order for the same seed', () => {
    renderRead({ search: '?part=check', seedOwner: 'owner-a' });
    const first = optionsOf(0);
    const expected = seededShuffle(q0.options, checkSeed('owner-a', L10.id, 0)).map((e) => e.item.text);
    expect(first).toEqual(expected);
    cleanup();
    renderRead({ search: '?part=check', seedOwner: 'owner-a' });
    expect(optionsOf(0)).toEqual(first);
  });

  it('stores the content index of the chosen option, not its shown position', async () => {
    const user = userEvent.setup();
    const { spies } = renderRead({ search: '?part=check', seedOwner: 'owner-b' });
    const correctIndex = q0.options.findIndex((o) => o.correct);
    await user.click(screen.getByRole('radio', { name: new RegExp(q0.options[correctIndex]!.text.replace('.', '\\.')) }));
    expect(latestProgress?.checkAnswers[0]).toEqual({ type: 'choice', selected: correctIndex, correct: true, tries: 1 });
    expect(spies.update).toHaveBeenCalledWith({ immediate: true });
    expect(spies.stageEvent).toHaveBeenCalledWith({ stage: 'read', kind: 'check-answered' });
    expect(screen.getByText(q0.options[correctIndex]!.feedback.replace(/^Yes\. /, ''))).toBeInTheDocument();
    expect(screen.getByText('Correct', { selector: '.tw-feedback-title' })).toBeInTheDocument();
  });

  it('says "Not quite" with the option\'s hint, and Try again lets the learner answer again', async () => {
    const user = userEvent.setup();
    renderRead({ search: '?part=check' });
    const wrongIndex = q0.options.findIndex((o) => !o.correct);
    const wrong = q0.options[wrongIndex]!;
    await user.click(screen.getByRole('radio', { name: new RegExp(wrong.text.replace('.', '\\.')) }));
    expect(screen.getByText(wrong.feedback.replace(/^Not quite\. /, ''))).toBeInTheDocument();
    expect(screen.getByText('Not quite yet', { selector: '.tw-feedback-title' })).toBeInTheDocument();
    expect(latestProgress?.checkAnswers[0]).toEqual({ type: 'choice', selected: wrongIndex, correct: false, tries: 1 });

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByText(wrong.feedback.replace(/^Not quite\. /, ''))).not.toBeInTheDocument();
    const firstGroup = screen.getAllByRole('radiogroup')[0]!;
    expect(within(firstGroup).getAllByRole('radio')[0]).toHaveFocus();
    // The saved answer stays until they choose again.
    expect(latestProgress?.checkAnswers[0]).toMatchObject({ selected: wrongIndex });

    const correctIndex = q0.options.findIndex((o) => o.correct);
    await user.click(screen.getByRole('radio', { name: new RegExp(q0.options[correctIndex]!.text.replace('.', '\\.')) }));
    expect(latestProgress?.checkAnswers[0]).toEqual({ type: 'choice', selected: correctIndex, correct: true, tries: 2 });
  });

  it('restores a saved answer with its result and feedback', () => {
    const q1 = L10.read.checks[1] as ChoiceCheck;
    const wrongIndex = q1.options.findIndex((o) => !o.correct);
    const initial: LessonProgress = {
      ...emptyProgress('learner-1', L10.id),
      checkAnswers: { 1: { type: 'choice', selected: wrongIndex, correct: false, tries: 1 } },
    };
    renderRead({ search: '?part=check', initial });
    const chosen = screen.getByRole('radio', { name: new RegExp(q1.options[wrongIndex]!.text.replace('.', '\\.')) });
    expect(chosen).toHaveAttribute('aria-checked', 'true');
    expect(chosen).toHaveClass('tw-option-retry');
    expect(screen.getByText(q1.options[wrongIndex]!.feedback.replace(/^Not quite\. /, ''))).toBeInTheDocument();
  });

  it('saves the think answer', async () => {
    const user = userEvent.setup();
    const { spies } = renderRead({ search: '?part=check' });
    const think = L10.read.checks[2]!;
    const box = screen.getByRole('textbox', { name: think.question });
    await user.type(box, 'The river');
    expect(latestProgress?.checkAnswers[2]).toEqual({ type: 'think', text: 'The river' });
    expect(spies.update).toHaveBeenLastCalledWith(undefined); // debounced, not immediate
    expect(screen.getByText('Question 3 of 3 · think it through')).toBeInTheDocument();
  });

  it('continues to Write and marks Read done', async () => {
    const user = userEvent.setup();
    const { spies } = renderRead({ search: '?part=check' });
    expect(screen.getByText('You can come back to these questions any time.')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Continue to Write' });
    expect(next).toBeEnabled();
    await user.click(next);
    expect(spies.stageEvent).toHaveBeenCalledWith({ stage: 'read', kind: 'continue' });
    expect(spies.goTo).toHaveBeenCalledWith('write');
    expect(latestProgress?.stagesDone).toEqual(['read']);
  });
});

describe('ReadStage: every lesson', () => {
  it('has all 24 lessons', () => {
    expect(getLessons()).toHaveLength(24);
  });

  it.each(getLessons().map((lesson) => [lesson.number, lesson] as const))(
    'renders every part (both versions) and the quick check of Lesson %i without console errors',
    (_number, lesson) => {
      const errors = vi.spyOn(console, 'error');
      const warnings = vi.spyOn(console, 'warn');
      for (const level of ['standard', 'simpler'] as const) {
        lesson.read.sections.forEach((section, index) => {
          renderRead({ lesson, level, search: `?part=${index + 1}` });
          expect(screen.getByRole('heading', { name: section.heading })).toBeInTheDocument();
          const text = level === 'simpler' ? section.simpler : section.text;
          expect(readingText()).toBe(text);
          expect(termButtons()).toHaveLength(glossaryEntriesIn(text, lesson.read.glossary).length);
          if (lesson.visual) expect(screen.getByRole('img', { name: lesson.visual.alt })).toBeInTheDocument();
          cleanup();
        });
      }
      renderRead({ lesson, search: '?part=check' });
      expect(screen.getAllByRole('radiogroup')).toHaveLength(
        lesson.read.checks.filter((check) => check.type === 'choice').length,
      );
      cleanup();
      expect(errors).not.toHaveBeenCalled();
      expect(warnings).not.toHaveBeenCalled();
    },
    20_000,
  );
});

describe('ReadStage with the real lesson player', () => {
  afterEach(async () => {
    cleanup();
    await deleteAllData();
  });

  function renderReal(search = '', lookAround = false) {
    return render(
      <MemoryRouter initialEntries={[`/lesson/${L10.id}/read${search}`]}>
        <LearnerSessionProvider forceLookAround={lookAround}>
          <LessonPlayerProvider lesson={L10} step="read">
            <ReadStage />
          </LessonPlayerProvider>
        </LearnerSessionProvider>
      </MemoryRouter>,
    );
  }

  it('saves the warm-up and a check answer for a learner, and restores them', async () => {
    const user = userEvent.setup();
    const store = await getStore();
    const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
    await store.setCurrentLearnerId(learner.id);

    const view = renderReal('?part=check');
    const correctIndex = (L10.read.checks[0] as ChoiceCheck).options.findIndex((o) => o.correct);
    const correctText = (L10.read.checks[0] as ChoiceCheck).options[correctIndex]!.text;
    await user.click(await screen.findByRole('radio', { name: new RegExp(correctText.replace('.', '\\.')) }));
    await waitFor(async () =>
      expect((await store.getProgress(learner.id, L10.id))?.checkAnswers[0]).toEqual({
        type: 'choice',
        selected: correctIndex,
        correct: true,
        tries: 1,
      }),
    );
    view.unmount();

    renderReal('?part=check');
    const restored = await screen.findByRole('radio', { name: new RegExp(correctText.replace('.', '\\.')) });
    await waitFor(() => expect(restored).toHaveAttribute('aria-checked', 'true'));
  });

  it('saves nothing when looking around', async () => {
    const user = userEvent.setup();
    const store = await getStore();
    const learner = await store.addLearner({ name: 'Hawa', colour: 'civics' });
    await store.setCurrentLearnerId(learner.id);

    renderReal('?part=check', true);
    const q0 = L10.read.checks[0] as ChoiceCheck;
    await user.click(await screen.findByRole('radio', { name: new RegExp(q0.options[0]!.text.replace('.', '\\.')) }));
    await user.click(screen.getByRole('button', { name: 'Part 3' }));
    await user.click(screen.getByRole('button', { name: 'Part 2' }));
    await user.click(screen.getByRole('button', { name: 'Part 1' }));
    await user.click(await screen.findByRole('radio', { name: 'Near the river' }));
    expect(screen.getByRole('radio', { name: 'Near the river' })).toHaveAttribute('aria-checked', 'true');
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(await store.getProgress(learner.id, L10.id)).toBeUndefined();
    expect(await store.listProgress(learner.id)).toEqual([]);
  });
});
