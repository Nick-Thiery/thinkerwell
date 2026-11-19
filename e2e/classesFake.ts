import type { Page, Request } from '@playwright/test';
import type { AdminStats, ClassDetail, ProgramOverview } from '../src/classes/protocol';

// A stand-in for /api/classes (docs/notes/online-classes.md), so the class
// views and joining a class can be walked without a database.

export const FAKE_KEY = 'k'.repeat(43);
export const FAKE_CODE = 'K7M-Q4P';
export const FAKE_CLASS = 'Morning group';
export const FAKE_ORG = 'Harbour Learning Centre';
export const FAKE_NICKNAMES = ['Mohammed Abdirahman', 'Amira'];
/** Everything the stand-in shows that someone typed: names and the code (for the language checks). */
export const FAKE_TYPED = [FAKE_CLASS, FAKE_ORG, FAKE_CODE, ...FAKE_NICKNAMES, 'Afternoon group'];

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export function fakeClass(named = true): ClassDetail {
  return {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    name: FAKE_CLASS,
    code: FAKE_CODE,
    orgName: FAKE_ORG,
    createdAt: ago(30),
    archived: false,
    learners: FAKE_NICKNAMES.map((nickname, i) => ({
      id: named ? `0000000${i}-1111-4111-8111-111111111111` : `learner-${i + 1}`,
      name: named ? nickname : null,
      number: i + 1,
      language: i === 0 ? 'en' : 'id',
      readingLevel: i === 0 ? 'standard' : 'simpler',
      joinedAt: ago(20),
      lastActiveAt: i === 0 ? ago(1) : ago(12),
      progress: [
        {
          lessonId: 'finding-out-about-the-past',
          courseId: 'our-world',
          stagesDone: ['read', 'write', 'speak', 'watch', 'reflect'],
          currentStage: 'reflect',
          updatedAt: ago(2),
          completedAt: ago(2),
        },
        {
          lessonId: 'towns-near-rivers',
          courseId: 'our-world',
          stagesDone: ['read'],
          currentStage: 'write',
          updatedAt: ago(1),
          completedAt: null,
        },
        ...(i === 0
          ? [
              {
                lessonId: 'dw-what-ai-is',
                courseId: 'digital-world',
                stagesDone: ['read' as const],
                currentStage: 'write' as const,
                updatedAt: ago(3),
                completedAt: null,
              },
            ]
          : []),
      ],
      checks: [{ sectionId: 'history', attempts: 2 }],
    })),
  };
}

export function fakeProgram(): ProgramOverview {
  return {
    id: 'b6f2e0a4-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
    name: FAKE_ORG,
    classes: [
      {
        id: fakeClass().id,
        name: FAKE_CLASS,
        code: FAKE_CODE,
        createdAt: ago(30),
        archived: false,
        learners: 2,
        activeThisWeek: 1,
        lessonsFinished: 2,
      },
      {
        id: '1b4e28ba-2fa1-41d2-883f-0016d3cca427',
        name: 'Afternoon group',
        code: 'XQ4-7PK',
        createdAt: ago(40),
        archived: true,
        learners: 0,
        activeThisWeek: 0,
        lessonsFinished: 0,
      },
    ],
  };
}

export function fakeStats(): AdminStats {
  const monday = new Date();
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      orgs: 1,
      classes: 2,
      learners: 2,
      active7: 1,
      active30: 2,
      lessonsStarted: 5,
      lessonsFinished: 2,
      stagesDone: 13,
      checksTried: 4,
    },
    weeks: Array.from({ length: 12 }, (_, i) => {
      const d = new Date(monday.getTime() - (11 - i) * 7 * 86_400_000);
      return {
        week: d.toISOString().slice(0, 10),
        newLearners: i === 8 ? 2 : 0,
        activeLearners: i > 8 ? 2 : i > 4 ? 1 : 0,
        lessonsFinished: i === 10 ? 2 : 0,
      };
    }),
    courses: [
      {
        courseId: 'our-world',
        learners: 2,
        lessonsStarted: 4,
        lessonsFinished: 2,
      },
      {
        courseId: 'digital-world',
        learners: 1,
        lessonsStarted: 1,
        lessonsFinished: 0,
      },
    ],
    languages: [
      { language: 'en', learners: 1 },
      { language: 'id', learners: 1 },
    ],
    readingLevels: [
      { level: 'standard', learners: 1 },
      { level: 'simpler', learners: 1 },
    ],
    stages: [
      { stage: 'read', lessons: 5 },
      { stage: 'write', lessons: 2 },
      { stage: 'speak', lessons: 2 },
      { stage: 'watch', lessons: 2 },
      { stage: 'reflect', lessons: 2 },
    ],
    dropOff: [
      {
        lessonId: 'towns-near-rivers',
        courseId: 'our-world',
        started: 3,
        finished: 1,
      },
    ],
    retention: { cohort: 2, returned: 1 },
    finishedBands: [
      { band: '0', learners: 0 },
      { band: '1–2', learners: 2 },
    ],
    orgs: [
      {
        id: fakeProgram().id,
        name: FAKE_ORG,
        enabled: true,
        createdAt: ago(30),
        classes: 2,
        learners: 2,
        activeThisWeek: 1,
        lessonsFinished: 2,
      },
    ],
  };
}

/** Answers /api/classes like the server would; returns the requests it saw. */
export async function standInForClasses(page: Page): Promise<Request[]> {
  const seen: Request[] = [];
  await page.route('**/api/classes**', async (route) => {
    const request = route.request();
    seen.push(request);
    const url = new URL(request.url());
    const body = request.method() === 'POST' ? (request.postDataJSON() as Record<string, unknown>) : {};
    const action = url.searchParams.get('action') ?? (typeof body.action === 'string' ? body.action : '');
    const json = (status: number, data: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    switch (action) {
      case 'lookup':
        return url.searchParams.get('code') === FAKE_CODE ? json(200, { className: FAKE_CLASS, orgName: FAKE_ORG }) : json(404, { error: 'unknown-class' });
      case 'sync': {
        const learners = (body.learners as Array<{ id: string }> | undefined) ?? [];
        return json(200, {
          results: Object.fromEntries(learners.map((l) => [l.id, 'saved'])),
        });
      }
      case 'class':
      case 'program.class':
        return json(200, fakeClass());
      case 'admin.class':
        return json(200, fakeClass(false));
      case 'program':
      case 'admin.org':
        return json(200, fakeProgram());
      case 'admin':
        return json(200, fakeStats());
      case 'program.createClass':
        return json(200, {
          id: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5',
          name: body.name,
          code: 'PW3-9RT',
          teacherKey: 't'.repeat(43),
        });
      default:
        return json(200, { ok: true });
    }
  });
  return seen;
}
