import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL } from '../app/contact';
import { EducatorsPage } from './EducatorsPage';
import { ConsentFormPage } from './educators/ConsentFormPage';
import { InformationSheetPage } from './educators/InformationSheetPage';
import { OrganisationsPage } from './OrganisationsPage';

// The team's real address (src/app/contact.ts, October 2026) is shown on the
// four pages that offer it, as a mail link or in the printed text, and never
// as a placeholder.

function renderAt(path: string, element: ReactNode) {
  const router = createMemoryRouter([{ path, element }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('the contact address', () => {
  it('is the team’s real address', () => {
    expect(CONTACT_EMAIL).toBe('hello@thinkerwell.app');
  });

  it('is on the Educators page, as a mail link', () => {
    renderAt('/educators', <EducatorsPage />);
    expect(screen.getByRole('link', { name: 'hello@thinkerwell.app' })).toHaveAttribute('href', 'mailto:hello@thinkerwell.app');
  });

  it('is on For organisations, as a mail link', () => {
    renderAt('/organisations', <OrganisationsPage />);
    expect(screen.getByRole('link', { name: 'hello@thinkerwell.app' })).toHaveAttribute('href', 'mailto:hello@thinkerwell.app');
  });

  it('is printed on the consent form', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('hello@thinkerwell.app');
  });

  it('is printed on the information sheet', () => {
    renderAt('/educators/information-sheet', <InformationSheetPage />);
    const sheet = screen.getByRole('article');
    expect(sheet).toHaveTextContent('hello@thinkerwell.app');
    expect(within(sheet).queryByText(/\[CONTACT EMAIL\]/)).toBeNull();
  });
});
