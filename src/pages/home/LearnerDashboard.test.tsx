import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLessons, type Lesson } from '../../content';
import { connectServiceWorker, resetServiceWorkerForTests } from '../../offline';
import { emptyProgress, type Learner, type LessonProgress } from '../../storage';
import { I18nProvider, LOCALES } from '../../i18n';
import { LearnerDashboard } from './LearnerDashboard';

const learner: Learner = { id: 'a', name: 'Amina', colour: 'lemon', createdAt: '2026-09-01T00:00:00.000Z' };
// These tests are about the dashboard's cards, not its language choice
// (src/app/LanguageChoice.test.tsx), which needs a learner session: offer
// English alone so it doesn't show.
const englishOnly = [LOCALES[0]!];

function renderDashboard() {
  return render(
    <I18nProvider offered={englishOnly}>
      <MemoryRouter>
        <LearnerDashboard learner={learner} progress={new Map()} />
      </MemoryRouter>
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
        messageSkipWaiting: vi.fn(),
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

afterEach(() => {
  resetServiceWorkerForTests();
});

describe('LearnerDashboard: offline badge', () => {
  it('says every lesson works offline once the course is on the device', async () => {
    const disconnect = await connect(true);
    renderDashboard();
    expect(screen.getByText('All 24 lessons work offline')).toBeInTheDocument();
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    disconnect();
  });

  it('says the lessons are being saved on the first visit', async () => {
    const disconnect = await connect(false);
    renderDashboard();
    expect(screen.getByText('Saving lessons for offline use')).toBeInTheDocument();
    expect(screen.queryByText(/work offline/)).not.toBeInTheDocument();
    disconnect();
  });

  it('claims nothing where this browser can’t keep the course offline', () => {
    renderDashboard();
    expect(screen.queryByText(/offline/)).not.toBeInTheDocument();
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
  });
});

describe('LearnerDashboard: the continue card', () => {
  const [first, second] = getLessons() as [Lesson, Lesson];
  const finished: LessonProgress = {
    ...emptyProgress('a', first.id),
    stagesDone: ['read', 'write', 'speak', 'watch', 'reflect'],
    completedAt: '2026-09-02T00:00:00.000Z',
  };

  function renderWith(progress: Map<string, LessonProgress>) {
    return render(
      <I18nProvider offered={englishOnly}>
        <MemoryRouter>
          <LearnerDashboard learner={learner} progress={progress} />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  it('offers the next lesson as "Up next" with Start when it has not been opened', () => {
    renderWith(new Map([[first.id, finished]]));
    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(screen.queryByText('Pick up where you left off')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start/ })).toHaveAttribute('href', expect.stringContaining(second.id));
  });

  it('says "Pick up where you left off" with Continue for a lesson with work in it', () => {
    const started: LessonProgress = { ...emptyProgress('a', second.id), stagesDone: ['read'], currentStage: 'write' };
    renderWith(new Map([[first.id, finished], [second.id, started]]));
    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', expect.stringContaining(second.id));
  });
});

describe('LearnerDashboard: the course certificate', () => {
  const lessons = getLessons();
  const done = (lesson: Lesson): LessonProgress => ({
    ...emptyProgress('a', lesson.id),
    stagesDone: ['read', 'write', 'speak', 'reflect'],
    completedAt: '2026-09-02T00:00:00.000Z',
  });

  function renderWith(progress: Map<string, LessonProgress>) {
    return render(
      <I18nProvider offered={englishOnly}>
        <MemoryRouter>
          <LearnerDashboard learner={learner} progress={progress} />
        </MemoryRouter>
      </I18nProvider>,
    );
  }

  it('links to it once all 24 lessons are finished, with no section check needed', () => {
    renderWith(new Map(lessons.map((lesson) => [lesson.id, done(lesson)])));
    expect(screen.getByRole('heading', { level: 2, name: "You've finished the course" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get your course certificate' })).toHaveAttribute('href', '/certificate/course');
  });

  it('has no link while a lesson is left', () => {
    renderWith(new Map(lessons.slice(1).map((lesson) => [lesson.id, done(lesson)])));
    expect(screen.queryByRole('link', { name: /certificate/ })).not.toBeInTheDocument();
  });
});
