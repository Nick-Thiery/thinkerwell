import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { OrganisationsPage } from '../OrganisationsPage';
import { CodeCardsPage } from './CodeCardsPage';

// These tests cover the pages without an address (src/app/contact.ts); contactEmail.test.tsx covers them with the real one.
vi.mock('../../app/contact', () => ({ CONTACT_EMAIL: null }));

/** The partner kit: For organisations and code cards. */

function renderAt(path: string, element: React.ReactElement) {
  const router = createMemoryRouter([{ path: path.replace(/\?.*$/, ''), element }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('For organisations', () => {
  it('is about using Thinkerwell now, and says plainly who runs it and that it is not a registered charity', () => {
    renderAt('/organisations', <OrganisationsPage />);
    expect(screen.getByText('For learning organisations')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Use Thinkerwell with your learners' })).toBeInTheDocument();
    expect(screen.getByText(/Thinkerwell offers free social studies courses and educator resources for youth across Southeast Asia/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the courses' })).toHaveAttribute('href', '/course');
    const who = screen.getByRole('region', { name: 'Who runs Thinkerwell?' });
    expect(within(who).getByText(/It is not a registered charity or nonprofit/)).toBeInTheDocument();
    expect(screen.getByText(/Four courses for learners aged about 10 to 17\. Exploring Our World: 24 lessons/)).toBeInTheDocument();
    // The platform isn't presented as a pilot: the one mention is the sentence about the initial pilot with selected partners.
    expect(document.body.textContent.match(/pilot/gi)).toHaveLength(2);
  });

  it('covers what you get, what you need to run a group, using the course and getting ready', () => {
    renderAt('/organisations', <OrganisationsPage />);
    for (const name of ['What Thinkerwell offers', 'What you get', 'What you need to run a group', 'Using Thinkerwell', 'Get ready']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    const need = screen.getByRole('region', { name: 'What you need to run a group' });
    expect(within(need).getByText('An educator or volunteer to lead each session.')).toBeInTheDocument();
    // No weeks-long commitment, and no study tasks, to use the course.
    expect(need.textContent).not.toMatch(/weeks|feedback|study/i);
    const using = screen.getByRole('region', { name: 'Using Thinkerwell' });
    expect(within(using).getByText(/Learners can use codes instead of names\. Each learner gets a code card/)).toBeInTheDocument();
    // Honest about the outside services a learner can reach: never "nothing leaves the device".
    expect(within(using).getByText(/Learners' work and progress stay on the device they use, and are not sent to Thinkerwell\. Online speech-to-text is off/)).toBeInTheDocument();
    expect(within(using).getByText(/They play from YouTube/)).toBeInTheDocument();
    expect(screen.queryByText(/nothing at all leaves the device/)).not.toBeInTheDocument();
    const ready = screen.getByRole('region', { name: 'Get ready' });
    expect(within(ready).getByRole('link', { name: 'Open the checklist' })).toHaveAttribute('href', '/educators/setup');
    expect(within(ready).getByRole('link', { name: 'Make code cards' })).toHaveAttribute('href', '/educators/code-cards');
    expect(within(ready).getByRole('link', { name: 'Print the guide' })).toHaveAttribute('href', '/educators/session-guide');
  });

  it('has no learning study package, and says once how the initial pilot works', () => {
    renderAt('/organisations', <OrganisationsPage />);
    // The optional learning study's section, its consent wording and its print buttons were retired on 11 November 2026.
    expect(document.body.textContent).not.toMatch(/learning study|study data|Print information sheets|Print consent forms|Print the check|Share optional/i);
    expect(document.querySelector('a[href*="consent-form"], a[href*="information-sheet"], a[href*="learning-check"]')).toBeNull();
    // One sentence, in the section with the contact link (Justin's wording, word for word).
    const sentence =
      'Thinkerwell’s initial pilot is for selected partner organisations. Lessons, timing, feedback, any data collection and required permissions are agreed directly with each organisation before its pilot begins.';
    expect(document.body.textContent.split(sentence)).toHaveLength(2);
    const contact = screen.getByRole('region', { name: 'Get in touch' });
    expect(contact).toHaveTextContent(sentence);
    expect(within(contact).getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', '/contact');
  });

  it('gets in touch through the contact form, with no placeholder address', () => {
    renderAt('/organisations', <OrganisationsPage />);
    const links = screen.getAllByRole('link', { name: 'Get in touch' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/contact');
    expect(screen.queryByText(/\[CONTACT EMAIL\]/)).not.toBeInTheDocument();
  });
});

describe('code cards', () => {
  it('makes a card for each learner and a matching list with a space for each name', async () => {
    const user = userEvent.setup();
    const router = renderAt('/educators/code-cards', <CodeCardsPage />);
    // No prefix yet: nothing to print.
    expect(screen.queryByRole('button', { name: 'Print' })).toBeNull();
    const prefix = screen.getByRole('textbox', { name: 'Prefix' });
    await user.type(prefix, 'abc');
    const count = screen.getByRole('textbox', { name: 'Number of learners' });
    await user.clear(count);
    await user.type(count, '12');

    expect(document.querySelector('.tw-codes-summary')).toHaveTextContent('12 cards, from ABC-01 to ABC-12. Print on A4 and cut along the dashed lines.');
    const cards = [...document.querySelectorAll('.tw-code-card-code')].map((card) => card.textContent);
    expect(cards).toEqual(Array.from({ length: 12 }, (_, i) => `ABC-${String(i + 1).padStart(2, '0')}`));
    expect(document.querySelectorAll('.tw-codes-sheet')).toHaveLength(2);
    expect(screen.getAllByText("Tap “I'm new here” and type this code as your name.")).toHaveLength(12);

    const list = screen.getByRole('table');
    const rows = within(list).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(cards);
    for (const row of rows) expect(within(row).getByRole('cell')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?prefix=ABC&count=12');
  });

  it('comes back with the same cards from the address, and says kindly what to fix', async () => {
    const user = userEvent.setup();
    renderAt('/educators/code-cards?prefix=abc&count=3', <CodeCardsPage />);
    expect([...document.querySelectorAll('.tw-code-card-code')].map((card) => card.textContent)).toEqual(['ABC-01', 'ABC-02', 'ABC-03']);

    const count = screen.getByRole('textbox', { name: 'Number of learners' });
    await user.clear(count);
    await user.type(count, '99');
    expect(count).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Choose a number from 1 to 60.')).toBeInTheDocument();
    expect(document.querySelector('.tw-code-card')).toBeNull();

    const prefix = screen.getByRole('textbox', { name: 'Prefix' });
    await user.clear(prefix);
    await user.type(prefix, 'a');
    await user.tab();
    expect(screen.getByText('Use 2 to 5 letters or numbers.')).toBeInTheDocument();
  });
});
