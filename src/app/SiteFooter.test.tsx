import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { THINKERWELL_LINKEDIN } from '../seo/site';
import { SiteFooter } from './SiteFooter';

function renderFooter() {
  const router = createMemoryRouter([{ path: '*', element: <SiteFooter /> }], { initialEntries: ['/'] });
  render(<RouterProvider router={router} />);
}

describe('SiteFooter', () => {
  it('links For organisations and Credits', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'For organisations' })).toHaveAttribute('href', '/organisations');
    expect(screen.getByRole('link', { name: 'Credits' })).toHaveAttribute('href', '/credits');
  });

  it("links Thinkerwell's LinkedIn Page once, in a new tab, with no referrer", () => {
    renderFooter();
    const links = screen.getAllByRole('link', { name: /LinkedIn/ });
    expect(links).toHaveLength(1);
    const linkedin = links[0]!;
    // jsdom drops the space before the hidden words; browsers keep it.
    expect(linkedin).toHaveAccessibleName(/^Thinkerwell on LinkedIn\s*\(opens in a new tab\)$/);
    expect(linkedin).toHaveAttribute('href', THINKERWELL_LINKEDIN);
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', 'noreferrer');
  });
});
