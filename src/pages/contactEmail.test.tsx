import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL } from '../app/contact';
import { EducatorsPage } from './EducatorsPage';
import { OrganisationsPage } from './OrganisationsPage';

// The team's real address (src/app/contact.ts, October 2026) is shown on the
// pages that offer it, as a mail link, and never as a placeholder.

function renderAt(path: string, element: ReactNode) {
  const router = createMemoryRouter([{ path, element }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('the contact address', () => {
  it('is the team’s real address', () => {
    expect(CONTACT_EMAIL).toBe('thinkerwell.hello@gmail.com');
  });

  it('is on the Educators page, as a mail link', () => {
    renderAt('/educators', <EducatorsPage />);
    expect(screen.getByRole('link', { name: 'thinkerwell.hello@gmail.com' })).toHaveAttribute('href', 'mailto:thinkerwell.hello@gmail.com');
  });

  it('is on For organisations, as a mail link', () => {
    renderAt('/organisations', <OrganisationsPage />);
    expect(screen.getByRole('link', { name: 'thinkerwell.hello@gmail.com' })).toHaveAttribute('href', 'mailto:thinkerwell.hello@gmail.com');
  });
});
