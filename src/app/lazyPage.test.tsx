import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '../i18n';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { firstPageReady } from './firstPageReady';
import { lazyPage } from './lazyPage';
import { isPageDownloadError } from './pageDownload';
import type * as PageDownload from './pageDownload';

const pageDownload = vi.hoisted(() => ({ siteAnswers: vi.fn<() => Promise<boolean>>(), reloadPage: vi.fn<() => void>() }));
vi.mock('./pageDownload', async (importOriginal) => ({ ...(await importOriginal<typeof PageDownload>()), ...pageDownload }));

/** What Chromium says when a chunk can't be fetched. */
const notFetched = () => new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/lessonPages-AbC123.js');

function LessonPage() {
  return <h1>The lesson</h1>;
}

function Boom(): never {
  throw new Error('A bug in the page');
}

/** The app's shape: a layout with the header, a root error page, and a lazily loaded page under it. */
async function renderLazy(load: () => Promise<{ Page: typeof LessonPage }>) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <header>The header</header>
            <Outlet />
          </>
        ),
        errorElement: <RouteErrorPage />,
        children: [{ path: 'lesson', ...lazyPage(load, (module) => module.Page) }],
      },
    ],
    { initialEntries: ['/lesson'] },
  );
  await firstPageReady(router);
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  pageDownload.siteAnswers.mockResolvedValue(false);
  pageDownload.reloadPage.mockImplementation(() => undefined);
});

afterEach(() => {
  document.title = '';
});

describe('isPageDownloadError', () => {
  it("is true for each browser's words for a module it couldn't fetch", () => {
    expect(isPageDownloadError(notFetched())).toBe(true);
    expect(isPageDownloadError(new TypeError('error loading dynamically imported module: http://localhost/assets/x.js'))).toBe(true);
    expect(isPageDownloadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isPageDownloadError(new Error('Unable to preload CSS for /assets/style-x.css'))).toBe(true);
  });

  it('is false for any other error', () => {
    expect(isPageDownloadError(new TypeError("Cannot read properties of undefined (reading 'title')"))).toBe(false);
    expect(isPageDownloadError(new ReferenceError('lessons is not defined'))).toBe(false);
    expect(isPageDownloadError(new Error('Something else'))).toBe(false);
    expect(isPageDownloadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isPageDownloadError(null)).toBe(false);
  });
});

describe('a lazily loaded page', () => {
  it('shows once its code is there', async () => {
    await renderLazy(() => Promise.resolve({ Page: LessonPage }));
    expect(screen.getByRole('heading', { level: 1, name: 'The lesson' })).toBeInTheDocument();
  });

  it("whose code couldn't be downloaded says so calmly, under the header, with Try again and a way home", async () => {
    await renderLazy(() => Promise.reject(notFetched()));
    expect(screen.getByText('The header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: t('pageNotDownloaded.title') })).toBeInTheDocument();
    expect(screen.getByText(t('pageNotDownloaded.body'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('pageNotDownloaded.retry') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('pageNotDownloaded.home') })).toHaveAttribute('href', '/');
    expect(screen.queryByText(t('routeError.title'))).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(`${t('pageNotDownloaded.title')} | Thinkerwell`));
  });

  it('shows the page once Try again downloads it', async () => {
    const load = vi.fn<() => Promise<{ Page: typeof LessonPage }>>().mockRejectedValueOnce(notFetched()).mockResolvedValue({ Page: LessonPage });
    await renderLazy(load);
    await userEvent.click(screen.getByRole('button', { name: t('pageNotDownloaded.retry') }));
    expect(await screen.findByRole('heading', { level: 1, name: 'The lesson' })).toBeInTheDocument();
    expect(screen.getByText('The header')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    expect(pageDownload.reloadPage).not.toHaveBeenCalled();
  });

  it('loads the page again from the start when the browser keeps the failed download but the connection is back', async () => {
    pageDownload.siteAnswers.mockResolvedValue(true);
    await renderLazy(() => Promise.reject(notFetched()));
    await userEvent.click(screen.getByRole('button', { name: t('pageNotDownloaded.retry') }));
    await waitFor(() => expect(pageDownload.reloadPage).toHaveBeenCalledTimes(1));
  });

  it('says so when there is still no connection, and lets you try again', async () => {
    const load = vi.fn(() => Promise.reject(notFetched()));
    await renderLazy(load);
    const button = screen.getByRole('button', { name: t('pageNotDownloaded.retry') });
    await userEvent.click(button);
    expect(await screen.findByRole('status')).toHaveTextContent(t('pageNotDownloaded.stillOffline'));
    expect(pageDownload.reloadPage).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: t('pageNotDownloaded.title') })).toBeInTheDocument();
    await userEvent.click(button);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
  });

  it('still shows "Something went wrong" for an error in the code itself', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderLazy(() => Promise.reject(new ReferenceError('lessons is not defined')));
    expect(screen.getByRole('heading', { level: 1, name: t('routeError.title') })).toBeInTheDocument();
    expect(screen.queryByText(t('pageNotDownloaded.title'))).not.toBeInTheDocument();
  });

  it('still shows "Something went wrong" for a crash in a page that did download', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderLazy(() => Promise.resolve({ Page: Boom }));
    expect(screen.getByRole('heading', { level: 1, name: t('routeError.title') })).toBeInTheDocument();
  });

  it('still shows "Something went wrong" if Try again finds an error in the code itself', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = vi
      .fn<() => Promise<{ Page: typeof LessonPage }>>()
      .mockRejectedValueOnce(notFetched())
      .mockRejectedValue(new SyntaxError("The requested module doesn't provide an export named: 'Page'"));
    await renderLazy(load);
    await userEvent.click(screen.getByRole('button', { name: t('pageNotDownloaded.retry') }));
    expect(await screen.findByRole('heading', { level: 1, name: t('routeError.title') })).toBeInTheDocument();
    expect(pageDownload.reloadPage).not.toHaveBeenCalled();
  });
});
