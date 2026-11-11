import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PrivacyPage } from './PrivacyPage';

function renderPage() {
  const router = createMemoryRouter([{ path: '/privacy-and-safeguarding', element: <PrivacyPage /> }], { initialEntries: ['/privacy-and-safeguarding'] });
  return render(<RouterProvider router={router} />);
}

describe('Privacy & Child Safeguarding', () => {
  it('has one h1, the learners’ summary near the top, and the seven sections in order', () => {
    const { container } = renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy & Child Safeguarding');
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(h2s).toEqual([
      '1. Information and privacy',
      '2. How information is used',
      '3. External services',
      '4. Security, retention and choices',
      '5. Keeping children safe',
      '6. Images, recordings and stories',
      '7. Questions and concerns',
      'Guidance and further reading',
    ]);
    // The summary comes before the first section.
    const summary = screen.getByText('For learners:');
    const first = screen.getByRole('heading', { level: 2, name: '1. Information and privacy' });
    expect(summary.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // No heading level is skipped.
    const levels = [...container.querySelectorAll('h1,h2,h3,h4')].map((heading) => Number(heading.tagName[1]));
    for (let i = 1; i < levels.length; i += 1) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });

  it('shows fixed dates, never today’s', () => {
    renderPage();
    expect(screen.getByText('Effective November 11, 2026. Last updated November 11, 2026.')).toBeInTheDocument();
  });

  it('labels the usage statistics as planned, says none are collected yet, and keeps coded data apart from them', () => {
    renderPage();
    const section = screen.getByRole('region', { name: '2. How information is used' });
    expect(within(section).getByText('Planned usage statistics.')).toBeInTheDocument();
    expect(section).toHaveTextContent('We will collect anonymised, aggregated numerical statistics');
    expect(section).toHaveTextContent('Thinkerwell does not collect these statistics yet.');
    expect(section).toHaveTextContent('switched off for everyone');
    expect(section).toHaveTextContent('Coded data is not anonymous');
  });

  it('discloses who receives information today and what stays on the device', () => {
    renderPage();
    const section = screen.getByRole('region', { name: '3. External services' });
    for (const name of ['Vercel (website hosting)', 'Resend (contact form delivery)', 'Google (our email inbox)', 'YouTube (optional videos)', 'Your browser’s speech service (only if turned on)']) {
      expect(within(section).getByRole('heading', { level: 4, name })).toBeInTheDocument();
    }
    for (const [name, href] of [
      ['Vercel privacy policy', 'https://vercel.com/legal/privacy-policy'],
      ['Resend privacy policy', 'https://resend.com/legal/privacy-policy'],
    ] as const) {
      const link = within(section).getByRole('link', { name: new RegExp(name) });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    expect(within(section).getAllByRole('link', { name: /Google privacy policy/ })).toHaveLength(2);
    expect(within(section).getByRole('heading', { level: 3, name: 'Handled on the device, not sent to a service' })).toBeInTheDocument();
    expect(section).toHaveTextContent('No AI service receives learner information.');
  });

  it('says the profile Remove button exists, and that clearing browser data removes saved work', () => {
    renderPage();
    const section = screen.getByRole('region', { name: '4. Security, retention and choices' });
    expect(section).toHaveTextContent('Clearing Thinkerwell’s browser data can remove all locally saved profiles and work on that browser.');
    expect(section).toHaveTextContent('Remove deletes one learner’s lesson work');
  });

  it('gives the team’s address as a mail link, and the emergency limits', () => {
    renderPage();
    const section = screen.getByRole('region', { name: '7. Questions and concerns' });
    expect(within(section).getByRole('link', { name: 'thinkerwell.hello@gmail.com' })).toHaveAttribute('href', 'mailto:thinkerwell.hello@gmail.com');
    expect(section).toHaveTextContent('Journals are not monitored for safety concerns, and our inbox is not an emergency service.');
  });

  it('lists the five sources as plain links to their publishers, the PDF labelled, with no logos', () => {
    const { container } = renderPage();
    const refs = screen.getByRole('region', { name: 'Guidance and further reading' });
    expect(refs).toHaveTextContent('These organisations have not endorsed or certified Thinkerwell.');
    const links = within(refs).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-pdpa-for-children%27s-personal-data-in-the-digital-environment_mar24.pdf',
      'https://www.pdpc.gov.sg/help-and-resources/2018/01/basic-anonymisation',
      'https://www.unicef.org/documents/child-protection-digital-education',
      'https://www.keepingchildrensafe.global/international-child-safeguarding-standards/',
      'https://www.unicef.org/childrightsandbusiness/child-safeguarding-toolkit-business',
    ]);
    expect(links[0]).toHaveAccessibleName(/\(PDF\)/);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.getAttribute('href')).not.toMatch(/[?&](utm_|ref=)/);
    }
    expect(container.querySelector('img, svg[role="img"]')).toBeNull();
    // English: no note that the sources are in English.
    expect(refs).not.toHaveTextContent('These sources are published in English.');
  });

  it('keeps the brief’s markers and internal notes off the page', () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/PUBLIC POLICY|PUBLIC REFERENCES|Nick \/ Claude|implementation brief|Confirm the policy matches/i);
  });
});
