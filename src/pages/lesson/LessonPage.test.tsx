import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { firstPageReady } from '../../app/firstPageReady';
import { routes } from '../../app/routes';
import { getLessons, type Lesson } from '../../content';
import { t } from '../../i18n';
import { clearGuestMemory } from '../../lesson';

/**
 * Every lesson's every step renders from the one template, through the real
 * app routes and lesson player (phase 4): each Read part, the quick check,
 * Write, Speak, Watch, Reflect and the completion screen, with nobody chosen
 * (so nothing is saved). Each step shows one h1, the right title, its own
 * lesson content and sources, one ink primary button, and no console errors
 * or warnings.
 *
 * Layout (sideways scrolling, sizes) needs a real browser: e2e/ covers it
 * for Lesson 10 and the routes spec.
 */

const lessons = getLessons();

function h1(): HTMLElement {
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings).toHaveLength(1);
  return headings[0]!;
}

/** The ink primary buttons in the page's main area (the design system allows one per view). */
function primaryButtons(): Element[] {
  return [...screen.getByRole('main').querySelectorAll('.tw-btn-primary')];
}

function steps(lesson: Lesson): Array<{ path: string; check: () => void }> {
  const sectionSteps = lesson.read.sections.map((section, index) => ({
    path: `read?part=${index + 1}`,
    check: () => {
      expect(screen.getByRole('heading', { name: section.heading })).toBeInTheDocument();
      expect(document.querySelector('.tw-reading-text')?.textContent).toBe(section.text);
      const evidence = screen.getByRole('region', { name: t('lessonPlayer.evidence.sectionLabel') });
      expect(within(evidence).getByText(lesson.evidence.question)).toBeInTheDocument();
      expect(evidence.querySelectorAll('figure.tw-lx-card')).toHaveLength(lesson.evidence.cards.length);
      if (lesson.visual) expect(within(evidence).getByRole('img', { name: lesson.visual.alt })).toBeInTheDocument();
    },
  }));
  const choices = lesson.read.checks.filter((check) => check.type === 'choice');
  return [
    ...sectionSteps,
    {
      path: 'read?part=check',
      check: () => {
        expect(screen.getAllByRole('radiogroup')).toHaveLength(choices.length);
        for (const check of choices) expect(screen.getByText(check.question)).toBeInTheDocument();
      },
    },
    {
      path: 'write',
      check: () => {
        expect(screen.getByText(lesson.write.prompt)).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: t('lessonPlayer.write.answerLabel') })).toBeInTheDocument();
        for (const item of lesson.write.selfCheck) expect(screen.getByRole('checkbox', { name: item })).toBeInTheDocument();
      },
    },
    {
      path: 'speak',
      check: () => {
        expect(screen.getByText(lesson.speak.partnerTask)).toBeInTheDocument();
        expect(screen.getByText(lesson.speak.independentTask)).toBeInTheDocument();
      },
    },
    {
      path: 'watch',
      check: () => {
        expect(screen.getByText(lesson.watch.beforeQuestion)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: t('ds.content.video.watchLabel') })).toBeInTheDocument();
        // Nothing from YouTube before the learner taps play.
        expect(document.querySelector('iframe')).toBeNull();
      },
    },
    {
      path: 'reflect',
      check: () => {
        for (const prompt of lesson.reflect.prompts) {
          expect(screen.getByRole('textbox', { name: new RegExp(`^${escapeRegExp(prompt.text)}`) })).toBeInTheDocument();
        }
      },
    },
    {
      path: 'complete',
      check: () => {
        // Nobody finished it on this visit, so nobody is told they did.
        expect(h1()).toHaveTextContent(t('lessonPlayer.complete.partwayTitle', { number: lesson.number }));
      },
    },
  ];
}

/** Every step ends with the lesson's sources, each linking to its page in a new tab. */
function expectSources(lesson: Lesson): void {
  const details = document.querySelector('details.tw-lesson-sources');
  expect(details).not.toBeNull();
  expect(within(details as HTMLElement).getByText(t('lessonPlayer.sources.title'))).toBeInTheDocument();
  const links = within(details as HTMLElement).getAllByRole('link', { hidden: true });
  expect(links.map((link) => link.getAttribute('href'))).toEqual(lesson.sources.map((source) => source.url));
  for (const link of links) expect(link).toHaveAttribute('target', '_blank');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let errors: MockInstance;
let warnings: MockInstance;

beforeEach(() => {
  clearGuestMemory();
  sessionStorage.clear();
  // ScrollRestoration and the Read stage scroll; jsdom implements neither.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  errors = vi.spyOn(console, 'error');
  warnings = vi.spyOn(console, 'warn');
});

afterEach(() => {
  cleanup();
});

describe('every lesson, every step', () => {
  it('has 24 lessons', () => {
    expect(lessons).toHaveLength(24);
  });

  it.each(lessons.map((lesson) => [lesson.number, lesson] as const))(
    'Lesson %i renders every step',
    async (_number, lesson) => {
      const all = steps(lesson);
      const router = createMemoryRouter(routes, { initialEntries: [`/lesson/${lesson.id}/${all[0]!.path}`] });
      // The lesson pages load when first opened (routes.tsx); mount once they have, as main.tsx does.
      await firstPageReady(router);
      render(<RouterProvider router={router} />);

      for (const [index, step] of all.entries()) {
        if (index > 0) await act(() => router.navigate(`/lesson/${lesson.id}/${step.path}`));
        const stage = step.path.replace(/\?.*$/, '') as 'read' | 'write' | 'speak' | 'watch' | 'reflect' | 'complete';
        if (stage === 'complete') {
          await waitFor(() => expect(document.querySelector('.tw-complete')).not.toBeNull());
        } else {
          // The stage renders once the player is ready (the session loads from IndexedDB first).
          await waitFor(() => expect(document.querySelector('.tw-actionbar')).not.toBeNull());
          expect(h1()).toHaveTextContent(lesson.title);
        }
        step.check();
        expectSources(lesson);
        const primaries = primaryButtons();
        if (stage === 'complete') expect(primaries.length, step.path).toBeLessThanOrEqual(1);
        else expect(primaries, step.path).toHaveLength(1);
        await waitFor(() =>
          expect(document.title).toBe(
            `${t('pages.lesson.title', { number: lesson.number, stage: t(`stages.${stage}`) })} · Thinkerwell`,
          ),
        );
      }

      expect(errors).not.toHaveBeenCalled();
      expect(warnings).not.toHaveBeenCalled();
    },
    20_000,
  );
});
