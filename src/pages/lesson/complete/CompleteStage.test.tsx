import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lessonPath, sectionCheckPath } from '../../../app/lessonUrls';
import { getLesson, getLessonByNumber, getLessons, type Lesson } from '../../../content';
import { LessonPlayerProvider, useLessonPlayer } from '../../../lesson';
import { clearGuestMemory, setGuestProgress } from '../../../lesson/guestMemory';
import { LearnerSessionProvider } from '../../../session';
import { deleteAllData, emptyProgress, getStore, type LessonProgress } from '../../../storage';
import { CompleteStage, completionSummary, firstUnfinishedStage } from './CompleteStage';

const lesson = getLesson('towns-near-rivers') as Lesson;
const byNumber = (n: number) => getLessonByNumber(n) as Lesson;

afterEach(async () => {
  vi.restoreAllMocks();
  clearGuestMemory();
  await deleteAllData();
});

async function addCurrentLearner(): Promise<string> {
  const store = await getStore();
  const learner = await store.addLearner({ name: 'Amina', colour: 'lemon' });
  await store.setCurrentLearnerId(learner.id);
  return learner.id;
}

async function saveProgress(learnerId: string, target: Lesson, change: (p: LessonProgress) => LessonProgress) {
  const store = await getStore();
  await store.updateProgress(learnerId, target.id, change);
}

const finished = (p: LessonProgress): LessonProgress => ({
  ...p,
  stagesDone: ['read', 'write', 'speak', 'watch', 'reflect'],
  reflections: { 0: 'Water for farms.' },
  completedAt: new Date().toISOString(),
});

/** What a guest's visit leaves in memory after tapping "Finish lesson". */
function finishAsGuest(target: Lesson = lesson) {
  setGuestProgress(finished(emptyProgress('guest', target.id)));
}

function WhenReady() {
  const { status } = useLessonPlayer();
  return status === 'ready' ? <CompleteStage /> : null;
}

function renderComplete(target: Lesson = lesson, { lookAround = false } = {}) {
  return render(
    <MemoryRouter initialEntries={[lessonPath(target.id, 'complete')]}>
      <LearnerSessionProvider forceLookAround={lookAround}>
        <LessonPlayerProvider lesson={target} step="complete">
          <WhenReady />
        </LessonPlayerProvider>
      </LearnerSessionProvider>
    </MemoryRouter>,
  );
}

/** The "Up next" rows, in order, by their link targets. */
function upNextHrefs(): string[] {
  const heading = screen.getByRole('heading', { name: 'Up next' });
  const list = heading.parentElement as HTMLElement;
  return within(list)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href') ?? '');
}

describe('completionSummary', () => {
  it('drops the first sentence when it repeats the heading', () => {
    expect(completionSummary('You finished Lesson 10. You explained rivers.', 'You finished Lesson 10.')).toBe(
      'You explained rivers.',
    );
    expect(completionSummary('Well done. You explained rivers.', 'You finished Lesson 10.')).toBe(
      'Well done. You explained rivers.',
    );
  });
});

describe('firstUnfinishedStage', () => {
  it('finds the first stage without a tick', () => {
    expect(firstUnfinishedStage([])).toBe('read');
    expect(firstUnfinishedStage(['read', 'speak'])).toBe('write');
    expect(firstUnfinishedStage(['read', 'write', 'speak', 'watch', 'reflect'])).toBe('reflect');
  });
});

// Generous timeouts: these use real IndexedDB (fake-indexeddb) and run beside the whole suite.
describe('CompleteStage', { timeout: 30_000 }, () => {
  it('shows a guest who finished the completion heading, the message, and that nothing was saved', async () => {
    finishAsGuest();
    renderComplete();
    expect(await screen.findByRole('heading', { level: 1, name: 'You finished Lesson 10.' })).toBeInTheDocument();
    expect(screen.getByText('Lesson 10 complete')).toBeInTheDocument();
    expect(screen.getByText(lesson.title, { selector: 'strong' })).toBeInTheDocument();
    expect(
      screen.getByText(/You explained why many towns grow near rivers and what problems rivers can bring\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing from this lesson was saved on this visit/)).toBeInTheDocument();
    expect(screen.getByText('Section 2 · Geography & Our Environment')).toBeInTheDocument();
  });

  it("never tells a guest who opens it without finishing that they finished", async () => {
    renderComplete(lesson, { lookAround: true });
    expect(await screen.findByRole('heading', { level: 1, name: "You're partway through Lesson 10." })).toBeInTheDocument();
    expect(screen.queryByText('Lesson 10 complete')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Read' })).toHaveAttribute('href', lessonPath(lesson.id, 'read'));
    expect(screen.getByText(/Nothing from this lesson was saved on this visit/)).toBeInTheDocument();
  });

  it('points to the next lesson in course order (Lesson 10 to Lesson 11), highlighted', async () => {
    finishAsGuest();
    renderComplete();
    await screen.findByRole('heading', { level: 1 });
    const next = byNumber(11);
    expect(upNextHrefs()).toEqual([lessonPath(next.id, 'read')]);
    const row = screen.getByRole('link', { name: new RegExp(`^Lesson 11: `) });
    expect(row).toHaveClass('tw-row-now');
    expect(row).toHaveTextContent(next.title);
    expect(row).toHaveTextContent(`About ${next.estimatedMinutes[0]}–${next.estimatedMinutes[1]} min`);
    expect(row).toHaveTextContent('Start');
  });

  it("puts the section check first after a section's last lesson (Lesson 9: History check, then Lesson 10)", async () => {
    finishAsGuest(byNumber(9));
    renderComplete(byNumber(9));
    await screen.findByRole('heading', { level: 1 });
    expect(upNextHrefs()).toEqual([sectionCheckPath('history'), lessonPath(lesson.id, 'read')]);
    expect(screen.getByRole('link', { name: /^Section check: History & Human Stories/ })).toHaveClass('tw-row-now');
    // One lemon highlight per screen.
    expect(document.querySelectorAll('.tw-row-now')).toHaveLength(1);
  });

  it('shows only the Civics section check after the last lesson (Lesson 24)', async () => {
    finishAsGuest(byNumber(24));
    renderComplete(byNumber(24));
    await screen.findByRole('heading', { level: 1 });
    expect(upNextHrefs()).toEqual([sectionCheckPath('civics')]);
    expect(screen.getByRole('link', { name: /Back to the course/ })).toHaveAttribute('href', '/course#civics');
  });

  it("counts the learner's finished lessons in the section, including this one", async () => {
    const learnerId = await addCurrentLearner();
    await saveProgress(learnerId, lesson, (p) => ({ ...finished(p), writing: { ...p.writing, text: 'Near the river.' } }));
    await saveProgress(learnerId, byNumber(12), finished);
    await saveProgress(learnerId, byNumber(11), (p) => ({ ...p, stagesDone: ['read'], currentStage: 'write' }));
    renderComplete();
    expect(await screen.findByRole('heading', { level: 1, name: 'You finished Lesson 10.' })).toBeInTheDocument();
    expect(await screen.findByText('Geography & Our Environment · 2 of 5 lessons done')).toBeInTheDocument();
    expect(screen.getByText('Your writing and your reflection are saved in your journal.')).toBeInTheDocument();
    // Lesson 11 is in progress: Continue, back where they stopped.
    const row = screen.getByRole('link', { name: /^Lesson 11: / });
    expect(row).toHaveTextContent('Continue');
    expect(row).toHaveAttribute('href', lessonPath(byNumber(11).id, 'write'));
  });

  it("tells a learner who hasn't finished that they are partway, and where to go next", async () => {
    const learnerId = await addCurrentLearner();
    await saveProgress(learnerId, lesson, (p) => ({ ...p, stagesDone: ['read', 'write'] }));
    renderComplete();
    expect(await screen.findByRole('heading', { level: 1, name: "You're partway through Lesson 10." })).toBeInTheDocument();
    expect(screen.queryByText('Lesson 10 complete')).not.toBeInTheDocument();
    expect(screen.getByText(/You've done 2 of 5 steps so far/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Speak' })).toHaveAttribute('href', lessonPath(lesson.id, 'speak'));
    expect(document.querySelectorAll('.tw-row-now')).toHaveLength(0);
  });

  it('lets every stage be reopened from the StagePath', async () => {
    renderComplete();
    await screen.findByRole('heading', { level: 1 });
    const nav = screen.getByRole('navigation');
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['read', 'write', 'speak', 'watch', 'reflect'].map((s) => `/lesson/${lesson.id}/${s}`));
  });

  it('renders every lesson without console errors, for a guest and a learner', { timeout: 120_000 }, async () => {
    const errors = vi.spyOn(console, 'error');
    for (const each of getLessons()) {
      finishAsGuest(each);
      const { unmount } = renderComplete(each);
      expect(await screen.findByRole('heading', { level: 1, name: `You finished Lesson ${each.number}.` })).toBeInTheDocument();
      unmount();
    }
    await addCurrentLearner();
    for (const each of getLessons()) {
      const { unmount } = renderComplete(each);
      expect(await screen.findByRole('heading', { level: 1, name: `You're partway through Lesson ${each.number}.` })).toBeInTheDocument();
      unmount();
    }
    expect(errors).not.toHaveBeenCalled();
  });
});
