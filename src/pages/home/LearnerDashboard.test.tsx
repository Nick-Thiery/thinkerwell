import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLessons } from '../../content';
import { courseSummaries } from '../../content/catalog';
import { connectServiceWorker, resetServiceWorkerForTests } from '../../offline';
import { emptyProgress, type Learner, type LessonProgress } from '../../storage';
import { I18nProvider, LOCALES } from '../../i18n';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData } from '../../storage';
import { LearnerDashboard } from './LearnerDashboard';

const learner: Learner = { id: 'a', name: 'Amina', colour: 'lemon', createdAt: '2026-09-01T00:00:00.000Z' };
// These tests are about the dashboard's cards, not its language choice
// (src/app/LanguageChoice.test.tsx), which needs a learner session: offer
// English alone so it doesn't show.
const englishOnly = [LOCALES[0]!];

function renderDashboard() {
  return render(
    <I18nProvider offered={englishOnly}>
      <LearnerSessionProvider>
        <MemoryRouter>
          <LearnerDashboard learner={learner} progress={new Map()} />
        </MemoryRouter>
      </LearnerSessionProvider>
    </I18nProvider>,
  );
}

/** A service worker whose registration has (or hasn't yet) an active worker. */
async function connect(active: boolean): Promise<() => void> {
  let disconnect: () => void = () => undefined;
  await act(async () => {
    disconnect = connectServiceWorker({
      workbox: {
        addEventListener: vi.fn(),
        register: () => Promise.resolve({ active: active ? {} : null } as ServiceWorkerRegistration),
        update: () => Promise.resolve(),
      },
      isControlled: () => active,
      reload: vi.fn(),
      isOnline: () => true,
      isVisible: () => true,
    });
    await Promise.resolve();
  });
  return disconnect;
}

afterEach(async () => {
  resetServiceWorkerForTests();
  await deleteAllData();
});

describe('LearnerDashboard: offline badge', () => {
  it('counts the lessons that work offline once the site is on the device', async () => {
    const disconnect = await connect(true);
    renderDashboard();
    // Here nothing else is kept on the device, so only Our World's 24 of all 73 are ready.
    expect(await screen.findByText('24 of 73 lessons ready offline')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Save all courses for offline use' })).toHaveAttribute('href', '/settings#course-files');
    expect(screen.getByText(/Save all courses in Settings first\. Videos need internet/)).toBeInTheDocument();
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    disconnect();
  });

  it('says the lessons are being saved on the first visit', async () => {
    const disconnect = await connect(false);
    renderDashboard();
    expect(await screen.findByText('Saving lessons for offline use')).toBeInTheDocument();
    expect(screen.queryByText(/ready offline|work offline/)).not.toBeInTheDocument();
    disconnect();
  });

  it('claims nothing where this browser can’t keep the course offline', () => {
    renderDashboard();
    expect(screen.queryByText(/offline/)).not.toBeInTheDocument();
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
  });
});


describe('LearnerDashboard: progress, next step and courses', () => {
  const ourWorld = getLessons();
  const dwIds = courseSummaries['digital-world']!.lessonIds;
  const done = (id: string, at: string): LessonProgress => ({
    ...emptyProgress('a', id),
    stagesDone: ['read', 'write', 'speak', 'reflect'],
    completedAt: at,
    updatedAt: at,
  });

  function renderWith(progress: Map<string, LessonProgress>) {
    return render(
      <I18nProvider offered={englishOnly}>
        <LearnerSessionProvider>
          <MemoryRouter>
            <LearnerDashboard learner={learner} progress={progress} />
          </MemoryRouter>
        </LearnerSessionProvider>
      </I18nProvider>,
    );
  }

  it('starts a new learner with a progress bar over all 73 lessons and a "Choose a course" card', async () => {
    renderWith(new Map());
    expect(await screen.findByRole('heading', { level: 1, name: 'Hi Amina' })).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Your progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '73');
    expect(screen.getByText('0 of 73 lessons completed')).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(screen.getByText('Choose a course to start learning.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a course' })).toBeInTheDocument();
    expect(screen.getByText('Nothing saved yet. Your writing and reflections show up here once you start.')).toBeInTheDocument();
  });

  it('keeps the mascot decorative', () => {
    renderWith(new Map());
    const bar = screen.getByRole('progressbar');
    const mascot = bar.querySelector('img');
    expect(mascot).toHaveAttribute('aria-hidden', 'true');
    expect(mascot).toHaveAttribute('alt', '');
  });

  it('lists the four courses with their own counts and a named Open course link', () => {
    renderWith(new Map([[ourWorld[0]!.id, done(ourWorld[0]!.id, '2026-09-02T00:00:00.000Z')]]));
    const rows = within(screen.getByRole('list', { name: '' })).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]!).getByText('1 of 24 lessons')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('0 of 17 lessons')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('0 of 12 lessons')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('0 of 20 lessons')).toBeInTheDocument();
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute('href', '/course');
    expect(within(rows[1]!).getByRole('link', { name: /^Open / })).toHaveAttribute('href', '/course/digital-world');
    expect(screen.getByText('1 of 73 lessons completed')).toBeInTheDocument();
  });

  it('resumes the lesson touched most recently, in any course, at its step', () => {
    const started: LessonProgress = { ...emptyProgress('a', dwIds[2]!), stagesDone: ['read'], currentStage: 'write', updatedAt: '2026-09-05T00:00:00.000Z' };
    renderWith(new Map([[ourWorld[0]!.id, done(ourWorld[0]!.id, '2026-09-02T00:00:00.000Z')], [dwIds[2]!, started]]));
    expect(screen.getByText('Resume here')).toBeInTheDocument();
    expect(screen.getByText('Pick up where you left off.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resume lesson/ })).toHaveAttribute('href', `/lesson/${dwIds[2]}/write`);
  });

  it('goes on to the next lesson of the course just finished', () => {
    renderWith(new Map([[dwIds[0]!, done(dwIds[0]!, '2026-09-05T00:00:00.000Z')], [ourWorld[0]!.id, done(ourWorld[0]!.id, '2026-09-02T00:00:00.000Z')]]));
    expect(screen.getByText('Resume here')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start lesson/ })).toHaveAttribute('href', `/lesson/${dwIds[1]}/read`);
  });

  it('asks to choose a course when the course just finished has no lesson left', () => {
    const progress = new Map(dwIds.map((id, index) => [id, done(id, `2026-09-0${1 + (index % 8)}T00:00:00.000Z`)]));
    progress.set(dwIds[3]!, done(dwIds[3]!, '2026-10-01T00:00:00.000Z'));
    renderWith(progress);
    expect(screen.getByText('Choose a course to start learning.')).toBeInTheDocument();
    expect(screen.getByText('17 of 17 lessons')).toBeInTheDocument();
  });

  it('says "Keep exploring" once all 73 lessons are finished', () => {
    const every = [...ourWorld.map((l) => l.id), ...Object.values(courseSummaries).flatMap((c) => [...c.lessonIds])];
    renderWith(new Map(every.map((id) => [id, done(id, '2026-09-02T00:00:00.000Z')])));
    expect(screen.getByText('73 of 73 lessons completed')).toBeInTheDocument();
    expect(screen.getByText('Keep exploring')).toBeInTheDocument();
    expect(screen.queryByText('Resume here')).not.toBeInTheDocument();
  });

  it('previews the latest writing from any course in "My journal"', () => {
    const written: LessonProgress = { ...emptyProgress('a', dwIds[0]!), writing: { ...emptyProgress('a', dwIds[0]!).writing, text: 'AI learns from many examples.' }, updatedAt: '2026-09-05T00:00:00.000Z' };
    renderWith(new Map([[dwIds[0]!, written]]));
    expect(screen.getByRole('heading', { name: 'My journal' })).toBeInTheDocument();
    expect(screen.getByText('AI learns from many examples.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open my journal' })).toHaveAttribute('href', '/journal');
  });

  it('moves to the course list when "Choose a course" is pressed', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderWith(new Map());
    await userEvent.click(screen.getByRole('button', { name: 'Choose a course' }));
    expect(screen.getByRole('heading', { name: 'Your courses' })).toHaveFocus();
  });
});
