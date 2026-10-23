import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { EducatorsPage } from './EducatorsPage';

// These tests cover the pages without an address (src/app/contact.ts); contactEmail.test.tsx covers them with the real one.
vi.mock('../app/contact', () => ({ CONTACT_EMAIL: null }));

function renderAt(path = '/educators') {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  const router = createMemoryRouter([{ path: '/educators', element: <EducatorsPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('EducatorsPage', () => {
  it('starts with the hero: browse the course, set up a device, a lesson on paper, and what you need', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'For educators' })).toBeInTheDocument();
    expect(screen.getByText('Run a Thinkerwell lesson with your group')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the course' })).toHaveAttribute('href', '/course');
    expect(screen.getByRole('link', { name: 'Set up a device' })).toHaveAttribute('href', '/educators/setup');
    expect(screen.getByRole('link', { name: 'See a lesson on paper' })).toHaveAttribute('href', '/lesson/finding-out-about-the-past/print');
    expect(screen.getByText('One device for every 1 to 3 learners, or one big screen')).toBeInTheDocument();
    // No link points at the old lesson list.
    expect(document.querySelector('a[href^="#"]')).toBeNull();
  });

  it('is a short start page: running a session, materials, this device, resources for a group, then questions', () => {
    renderAt();
    const order = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(order).toEqual([
      'What you need',
      'Run a session',
      'Teaching materials',
      'On this device',
      'Resources for your group',
      'Questions, or something to fix?',
    ]);
    // The lesson list is gone from this page: it lives at /educators/guides.
    expect(screen.queryByText('Preview any lesson')).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryAllByRole('link', { name: /^Teacher guide for Lesson/ })).toHaveLength(0);
  });

  it('says how to run a session in three short steps, with the overview video folded away', () => {
    renderAt();
    const how = screen.getByRole('region', { name: 'Run a session' });
    expect(within(how).getAllByRole('listitem').map((item) => item.querySelector('.h3')?.textContent)).toEqual([
      'Choose a lesson',
      'Read, respond and discuss',
      'Reflect together',
    ]);
    const fold = within(how).getByText('Watch a one-minute overview (optional)').closest('details')!;
    expect(fold).not.toHaveAttribute('open');
  });

  it('links the teaching materials and the tools for this device', () => {
    renderAt();
    const materials = screen.getByRole('region', { name: 'Teaching materials' });
    expect(within(materials).getByText('Teacher guides and answer keys')).toBeInTheDocument();
    expect(within(materials).getByRole('link', { name: 'Open the list' })).toHaveAttribute('href', '/educators/guides');
    const device = screen.getByRole('region', { name: 'On this device' });
    expect(within(device).getByText('Progress stays on the device it was made on.')).toBeInTheDocument();
    expect(within(device).getByRole('link', { name: 'See the class' })).toHaveAttribute('href', '/educators/class');
    expect(within(device).getByRole('link', { name: 'Print all certificates' })).toHaveAttribute('href', '/educators/class/certificates');
  });

  it('puts the resources for a group first, and the optional learning study in one closed fold', () => {
    renderAt();
    const group = screen.getByRole('region', { name: 'Resources for your group' });
    const titles = [...group.querySelectorAll('.tw-edu-check-title')].map((title) => title.textContent);
    expect(titles).toEqual(['Using Thinkerwell with a group', 'Session guide', 'Learner code cards', 'Information sheet', 'Consent form', 'Learning check']);
    expect(within(group).getByRole('link', { name: 'Read more' })).toHaveAttribute('href', '/organisations');
    expect(within(group).getByRole('link', { name: 'Print the guide' })).toHaveAttribute('href', '/educators/session-guide');
    expect(within(group).getByRole('link', { name: 'Make code cards' })).toHaveAttribute('href', '/educators/code-cards');

    const study = within(group).getByText('Optional learning study').closest('details')!;
    expect(study).not.toHaveAttribute('open');
    expect(study).toHaveTextContent("You don't need any of this to teach a lesson.");
    expect(within(study).getByRole('link', { name: 'Print information sheets' })).toHaveAttribute('href', '/educators/information-sheet');
    expect(within(study).getByRole('link', { name: 'Print consent forms' })).toHaveAttribute('href', '/educators/consent-form');
    expect(within(study).getByRole('link', { name: 'Print the check' })).toHaveAttribute('href', '/educators/learning-check');
  });

  it('says nothing about pilots, or what codes will do later', () => {
    renderAt();
    expect(document.body.textContent).not.toMatch(/pilot|Later, codes/i);
  });

  it('sends questions to the contact form, and shows no placeholder or form of its own while there is no address', () => {
    renderAt();
    const card = screen.getByRole('region', { name: 'Questions, or something to fix?' });
    expect(within(card).getByRole('link', { name: 'Send an enquiry' })).toHaveAttribute('href', '/contact');
    expect(screen.queryByText(/\[FEEDBACK EMAIL\]|\[CONTACT EMAIL\]/)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
