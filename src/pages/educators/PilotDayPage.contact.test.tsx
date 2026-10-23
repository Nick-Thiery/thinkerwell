import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PilotDayPage } from './PilotDayPage';

// Once the team has an address (src/app/contact.ts), the guide ends with who
// to contact, in the Educators page's own words.
vi.mock('../../app/contact', () => ({ CONTACT_EMAIL: 'team@example.org' }));

describe('the pilot day guide, with a contact address', () => {
  it('ends with who to contact, and asks for no learner names or written answers', () => {
    const router = createMemoryRouter([{ path: '/educators/session-guide', element: <PilotDayPage /> }], { initialEntries: ['/educators/session-guide'] });
    render(<RouterProvider router={router} />);
    const sheet = screen.getByRole('article');
    const contact = within(sheet).getByRole('region', { name: 'Questions, or something to fix?' });
    expect(contact).toHaveTextContent("Tell us at team@example.org. Don't send learners' names or written answers.");
    expect(within(contact).getByRole('link', { name: 'team@example.org' })).toHaveAttribute('href', 'mailto:team@example.org');
  });
});
