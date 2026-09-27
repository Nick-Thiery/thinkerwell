import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLessons, getSections } from '../content';
import { DEV_DIR_STORAGE_KEY, t } from '../i18n';
import { routes } from './routes';

type Router = ReturnType<typeof createMemoryRouter>;

function renderAt(path: string): Router {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

function heading(): HTMLElement {
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings).toHaveLength(1);
  return headings[0]!;
}

function where(router: Router): string {
  const { pathname, search, hash } = router.state.location;
  return `${pathname}${search}${hash}`;
}

const notFoundTitle = t('notFound.title');
const lessons = getLessons();
const first = lessons[0]!;
const last = lessons[lessons.length - 1]!;

beforeEach(() => {
  sessionStorage.clear();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
  document.title = '';
  // ScrollRestoration calls window.scrollTo, which jsdom doesn't implement.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  sessionStorage.clear();
});

describe('top-level routes', () => {
  const pages: Array<[string, string]> = [
    ['/', t('pages.home.title')],
    ['/course', t('pages.course.title')],
    ['/journal', t('pages.journal.title')],
    ['/educators', t('pages.educators.title')],
    ['/about', t('pages.about.title')],
  ];

  // Home and the course map read IndexedDB before they have anything to
  // show (see AppLayout's focus-after-navigation handling), so this waits
  // for the heading rather than asserting on the very first render; that
  // also passes trivially for the pages that render synchronously.
  it.each(pages)('%s shows one h1 with its title', async (path, title) => {
    renderAt(path);
    await waitFor(() => expect(heading()).toHaveTextContent(title));
    expect(document.title).toBe(t('app.documentTitle', { page: title }));
    expect(document.title).toBe(`${title} · Thinkerwell`);
  });

  it('sets lang and dir on <html>', () => {
    renderAt('/');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('has a skip link to #main, and main has that id', () => {
    renderAt('/');
    const skip = screen.getByRole('link', { name: t('app.skipToContent') });
    expect(skip).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it.each(pages)('marks the current nav link on %s with aria-current=page', (path) => {
    renderAt(path);
    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    const current = nav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('href', path);
  });

  it('marks Course as the current page on a lesson page, as the lesson screens do', () => {
    renderAt('/lesson/towns-near-rivers/read');
    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    const current = nav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(t('nav.course'));
  });
});

describe('Settings in the header', () => {
  it('is an icon link at the end of the header, outside the five main links', async () => {
    const user = userEvent.setup();
    const router = renderAt('/');
    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    expect(nav.querySelectorAll('a')).toHaveLength(5);
    const settings = screen.getByRole('link', { name: t('nav.settings') });
    expect(nav).not.toContainElement(settings);
    await user.click(settings);
    await waitFor(() => expect(heading()).toHaveTextContent(t('pages.settings.title')));
    expect(where(router)).toBe('/settings');
    expect(screen.getByRole('link', { name: t('nav.settings') })).toHaveAttribute('aria-current', 'page');
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });
});

describe('lesson routes', () => {
  // The lesson player reads the learner session (IndexedDB) before it shows
  // anything, so these wait for the h1: the lesson's title on every stage,
  // and the completion screen's own heading on 'complete'. The document
  // title names the lesson number and the stage.
  it.each([first, lessons[9]!, last].map((l) => [l.number, l] as const))(
    'lesson %i shows each stage with one h1',
    async (_n, lesson) => {
      for (const step of ['read', 'write', 'speak', 'watch', 'reflect', 'complete'] as const) {
        const { unmount } = render(
          <RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/lesson/${lesson.id}/${step}`] })} />,
        );
        const title = t('pages.lesson.title', { number: lesson.number, stage: t(`stages.${step}`) });
        if (step === 'complete') await waitFor(() => expect(heading()).toBeInTheDocument());
        else await waitFor(() => expect(heading()).toHaveTextContent(lesson.title));
        // document.title is set in an effect, which can run just after the DOM commit.
        await waitFor(() => expect(document.title).toBe(`${title} · Thinkerwell`));
        unmount();
      }
    },
    // Six sequential renders, each reading IndexedDB: generous under a busy full-suite run.
    20_000,
  );

  it('/lesson/:id redirects to Read', async () => {
    const router = renderAt('/lesson/changing-scale');
    await waitFor(() => expect(where(router)).toBe('/lesson/changing-scale/read'));
    await waitFor(() => expect(document.title).toBe('Lesson 3: Read · Thinkerwell'));
    await waitFor(() => expect(heading()).toBeInTheDocument());
  });

  it('/lesson/l6 lands on /lesson/towns-near-rivers/read', async () => {
    const router = renderAt('/lesson/l6');
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/read'));
    await waitFor(() => expect(document.title).toBe('Lesson 10: Read · Thinkerwell'));
    // A redirect replaces the old entry, so Back doesn't bounce into it again.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('/lesson/history-scale/watch keeps the stage', async () => {
    const router = renderAt('/lesson/history-scale/watch');
    await waitFor(() => expect(where(router)).toBe('/lesson/changing-scale/watch'));
    await waitFor(() => expect(document.title).toBe('Lesson 3: Watch · Thinkerwell'));
  });

  it('/lesson/l6/write?preview=true keeps ?preview=true', async () => {
    const router = renderAt('/lesson/l6/write?preview=true');
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/write?preview=true'));
    await waitFor(() => expect(document.title).toBe('Lesson 10: Write · Thinkerwell'));
  });

  it('keeps the hash on redirect', async () => {
    const router = renderAt('/lesson/l6?preview=true#check');
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/read?preview=true#check'));
  });

  it('matches /Lesson/L6/Watch case-insensitively', async () => {
    const router = renderAt('/Lesson/L6/Watch');
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/watch'));
    await waitFor(() => expect(document.title).toBe('Lesson 10: Watch · Thinkerwell'));
  });
});

describe('section checks', () => {
  it.each(getSections().map((s) => [s.id, s] as const))('/section/%s/check shows its title', (id, section) => {
    renderAt(`/section/${id}/check`);
    expect(heading()).toHaveTextContent(t('pages.sectionCheck.title', { section: section.title }));
  });
});

describe('certificates', () => {
  it.each(getSections().map((s) => [s.id, s] as const))('/certificate/section/%s shows its title', async (id, section) => {
    renderAt(`/certificate/section/${id}`);
    const title = t('certificates.sectionPageTitle', { section: section.title });
    await waitFor(() => expect(heading()).toHaveTextContent(title));
    expect(document.title).toBe(`${title} · Thinkerwell`);
  });

  it('/certificate/course shows its title', async () => {
    renderAt('/certificate/course');
    await waitFor(() => expect(heading()).toHaveTextContent('Course certificate'));
    expect(document.title).toBe('Course certificate · Thinkerwell');
  });
});

describe('not found', () => {
  it.each([
    '/lesson/nope/read',
    '/lesson/nope',
    '/lesson/towns-near-rivers/quiz',
    '/section/nope/check',
    '/whatever',
    '/lesson/towns-near-rivers/read/extra',
    '/educators/lesson/nope',
    '/educators/section/nope/answers',
    '/educators/section/history',
    '/certificate/section/nope',
    '/certificate/section',
    '/certificate/nope',
  ])(
    '%s shows the friendly 404',
    (path) => {
      const router = renderAt(path);
      expect(heading()).toHaveTextContent(notFoundTitle);
      expect(screen.getByText(t('notFound.body'))).toBeInTheDocument();
      expect(screen.getByRole('link', { name: t('notFound.home') })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: t('notFound.course') })).toHaveAttribute('href', '/course');
      expect(document.title).toBe(`${notFoundTitle} · Thinkerwell`);
      // It stays on the URL that was asked for, so the learner can see the typo.
      expect(router.state.location.pathname).toBe(path);
    },
  );
});

describe('old Base44 paths', () => {
  it('/onboarding redirects to home', async () => {
    const router = renderAt('/onboarding');
    await waitFor(() => expect(where(router)).toBe('/'));
    // Home reads IndexedDB before it has an h1 to show, so the URL can
    // update one tick before the heading appears.
    await waitFor(() => expect(heading()).toHaveTextContent(t('pages.home.title')));
  });

  it('/courses redirects to the course map', async () => {
    const router = renderAt('/courses');
    await waitFor(() => expect(where(router)).toBe('/course'));
    await waitFor(() => expect(heading()).toHaveTextContent(t('pages.course.title')));
  });
});

describe('right-to-left dev switch', () => {
  it('?dir=rtl sets dir="rtl" on <html> and shows the notice', () => {
    renderAt('/?dir=rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(sessionStorage.getItem(DEV_DIR_STORAGE_KEY)).toBe('rtl');
    expect(screen.getByRole('status')).toHaveTextContent(t('dev.rtlOn'));
  });

  it('persists across navigation, and ?dir=ltr clears it', async () => {
    const router = renderAt('/?dir=rtl');
    expect(document.documentElement.dir).toBe('rtl');

    await act(() => router.navigate('/course'));
    expect(heading()).toHaveTextContent(t('pages.course.title'));
    expect(document.documentElement.dir).toBe('rtl');

    await act(() => router.navigate('/about?dir=ltr'));
    expect(document.documentElement.dir).toBe('ltr');
    expect(sessionStorage.getItem(DEV_DIR_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(() => router.navigate('/journal'));
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('is remembered from earlier in the tab', () => {
    sessionStorage.setItem(DEV_DIR_STORAGE_KEY, 'rtl');
    renderAt('/course');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('keeps ?dir=rtl through a lesson redirect', async () => {
    const router = renderAt('/lesson/l6?dir=rtl');
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/read?dir=rtl'));
    expect(document.documentElement.dir).toBe('rtl');
  });
});

describe('focus after navigation', () => {
  it('does not move focus on first load', () => {
    renderAt('/course');
    expect(document.activeElement).toBe(document.body);
  });

  it('does not move focus after the initial redirect', async () => {
    const router = renderAt('/lesson/l6');
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/read'));
    await waitFor(() => expect(heading()).toHaveTextContent(getLessons()[9]!.title));
    expect(heading()).not.toHaveFocus();
    expect(document.activeElement).toBe(document.body);
  });

  it('moves focus to the h1 after clicking a nav link', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: t('nav.course') }));
    await waitFor(() => expect(heading()).toHaveTextContent(t('pages.course.title')));
    expect(heading()).toHaveFocus();
  });

  it('moves focus to the h1 after going back', async () => {
    const user = userEvent.setup();
    const router = renderAt('/');
    await user.click(screen.getByRole('link', { name: t('nav.about') }));
    await waitFor(() => expect(heading()).toHaveTextContent(t('pages.about.title')));
    (document.activeElement as HTMLElement | null)?.blur();

    await act(() => router.navigate(-1));
    await waitFor(() => expect(heading()).toHaveTextContent(t('pages.home.title')));
    expect(heading()).toHaveFocus();
  });

  it('moves focus to the h1 after a link that redirects (an old lesson id)', async () => {
    const router = renderAt('/');
    await act(() => router.navigate('/lesson/l6'));
    await waitFor(() => expect(where(router)).toBe('/lesson/towns-near-rivers/read'));
    expect(heading()).toHaveFocus();
  });

  it('moves focus to the 404 heading after a link to an unknown page', async () => {
    const router = renderAt('/');
    await act(() => router.navigate('/whatever'));
    expect(heading()).toHaveTextContent(notFoundTitle);
    expect(heading()).toHaveFocus();
  });
});
