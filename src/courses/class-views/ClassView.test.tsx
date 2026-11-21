import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import words from 'virtual:thinkerwell/messages/classViews';
import { describe, expect, it, vi } from 'vitest';
import type { ClassDetail, ViewLearner } from '../../classes/protocol';
import { useI18n, withWords, type I18nContextValue } from '../../i18n';
import en from '../../i18n/messages/en.json';
import { ClassView } from './ClassView';
import { ConfirmAction } from './ConfirmAction';
import type { FlatCourses } from './courses';

// The class views' parts found confusing in the walkthrough of 20 November 2026 (docs/notes/online-classes.md).

function WithWords({ children }: { children: (i18n: I18nContextValue) => React.ReactNode }) {
  const i18n = withWords(useI18n(), words);
  return <>{children(i18n)}</>;
}

const COURSES: FlatCourses = {
  courses: [{ id: 'our-world', title: 'Exploring Our World', sections: [{ id: 'history', title: 'History', lessonIds: ['l1', 'l2'], hasCheck: true }], lessonCount: 2 }],
  lessons: new Map([
    ['l1', { id: 'l1', number: 1, title: 'Finding out about the past', courseId: 'our-world', sectionId: 'history' }],
    ['l2', { id: 'l2', number: 2, title: 'Families', courseId: 'our-world', sectionId: 'history' }],
  ]),
  sections: new Map([['history', { id: 'history', title: 'History', lessonIds: ['l1', 'l2'], hasCheck: true, courseId: 'our-world' }]]),
};

const learner = (over: Partial<ViewLearner> = {}): ViewLearner => ({
  id: 'a',
  name: 'Amira',
  number: 1,
  language: 'en',
  readingLevel: 'standard',
  joinedAt: '2026-11-20T03:00:00Z',
  lastActiveAt: null,
  progress: [],
  checks: [],
  ...over,
});

const detail = (learners: ViewLearner[]): ClassDetail => ({
  id: 'c',
  name: 'Morning group',
  code: 'K7M-Q4P',
  orgName: 'Test org',
  createdAt: '2026-11-20T02:00:00Z',
  archived: false,
  learners,
});

describe('a class before anyone has started', () => {
  it('says "Not started yet", never "0 of 0 lessons finished"', () => {
    render(<WithWords>{(i18n) => <ClassView detail={detail([learner()])} courses={COURSES} i18n={i18n} now={new Date('2026-11-20T04:00:00Z')} />}</WithWords>);
    expect(screen.getByText('Not started yet')).toBeInTheDocument();
    expect(screen.queryByText(/of 0 lessons? finished/)).not.toBeInTheDocument();
  });

  it('counts the lessons once someone has started', () => {
    const started = learner({
      lastActiveAt: '2026-11-20T03:30:00Z',
      progress: [{ lessonId: 'l1', courseId: 'our-world', stagesDone: ['read'], currentStage: 'write', updatedAt: '2026-11-20T03:30:00Z', completedAt: null }],
    });
    render(<WithWords>{(i18n) => <ClassView detail={detail([started, learner({ id: 'b', name: 'Budi', number: 2 })])} courses={COURSES} i18n={i18n} now={new Date('2026-11-20T04:00:00Z')} />}</WithWords>);
    expect(screen.getAllByText('0 of 2 lessons finished')).toHaveLength(2);
  });
});

describe('an action that can\'t be taken back with one tap', () => {
  it('asks first, does nothing on "Not now", and acts only on the confirm', async () => {
    const user = userEvent.setup();
    const act = vi.fn(() => Promise.resolve());
    render(<WithWords>{(i18n) => <ConfirmAction i18n={i18n} label="New teacher link" question="Make a new teacher link? The link you sent before stops working." confirm="Make a new link" onConfirm={act} />}</WithWords>);
    await user.click(screen.getByRole('button', { name: 'New teacher link' }));
    expect(screen.getByText('Make a new teacher link? The link you sent before stops working.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(act).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'New teacher link' }));
    await user.click(screen.getByRole('button', { name: 'Make a new link' }));
    expect(act).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'New teacher link' })).toBeInTheDocument();
  });

  it('says so when it fails, instead of doing nothing', async () => {
    const user = userEvent.setup();
    render(<WithWords>{(i18n) => <ConfirmAction i18n={i18n} label="Close class" question="Close it?" confirm="Close class" onConfirm={() => Promise.reject(new Error('offline'))} />}</WithWords>);
    await user.click(screen.getByRole('button', { name: 'Close class' }));
    await user.click(screen.getByRole('button', { name: 'Close class' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.');
  });
});

describe('what a learner is told before joining', () => {
  it('lists everything the teacher sees, the same list as the teacher is told', () => {
    // The class view shows these about each learner (ClassView.tsx): keep the two texts and it in step.
    for (const said of [en.classJoin.whatTeacherSees, en.classJoin.sharing, en.classViews.common.whatYouSee]) {
      expect(said).toMatch(/name/);
      expect(said).toMatch(/lessons and steps/);
      expect(said).toMatch(/when/);
      expect(said).toMatch(/section check/);
      expect(said).toMatch(/language and reading level/);
    }
  });

  it('confirms with a button that differs from the one that opened the code box, in every language', async () => {
    for (const code of ['en', 'id', 'ms', 'vi'] as const) {
      const messages = (await import(`../../i18n/messages/${code}.json`)) as { default: typeof en };
      expect(messages.default.classJoin.join).not.toBe(messages.default.classJoin.open);
    }
  });
});

describe('the impact snapshot', () => {
  it('offers every month from November 2026 to this one, newest first', async () => {
    const { snapshotMonths } = await import('./ImpactSnapshot');
    expect(snapshotMonths(new Date('2026-11-20T00:00:00Z'))).toEqual(['2026-11']);
    expect(snapshotMonths(new Date('2027-02-03T00:00:00Z'))).toEqual(['2027-02', '2027-01', '2026-12', '2026-11']);
  });
});
