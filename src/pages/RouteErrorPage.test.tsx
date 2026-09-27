import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider, t } from '../i18n';
import { RouteErrorPage } from './RouteErrorPage';

function Boom(): never {
  throw new Error('boom');
}

/**
 * The route-level errorElement (src/app/routes.tsx): a crash anywhere below
 * "/" must show this friendly page, never react-router's own default error
 * screen, and must still offer a way back to Home.
 */
describe('RouteErrorPage', () => {
  it('shows a friendly message and a way back to Home when a route crashes', () => {
    // A real crash logs to the console in dev; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const router = createMemoryRouter(
      [{ path: '/', element: <Boom />, errorElement: <RouteErrorPage /> }],
      { initialEntries: ['/'] },
    );
    render(
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: t('routeError.title') })).toBeVisible();
    expect(screen.getByText(t('routeError.body'))).toBeVisible();
    expect(screen.getByRole('link', { name: t('routeError.home') })).toHaveAttribute('href', '/');
    vi.restoreAllMocks();
  });

  it('shows the not-found message for a 404 route error response, not the generic crash message', () => {
    const router = createMemoryRouter(
      [
        { path: '/', errorElement: <RouteErrorPage />, children: [{ path: 'known', element: <p>known</p> }] },
      ],
      { initialEntries: ['/unknown'] },
    );
    render(
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: t('routeError.title') })).toBeVisible();
    expect(screen.getByText(t('notFound.body'))).toBeVisible();
  });
});
