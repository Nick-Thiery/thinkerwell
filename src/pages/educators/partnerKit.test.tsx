import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { OrganisationsPage } from '../OrganisationsPage';
import { CodeCardsPage } from './CodeCardsPage';
import { ConsentFormPage } from './ConsentFormPage';

/** The partner kit: For organisations, the consent form and code cards. */

function renderAt(path: string, element: React.ReactElement) {
  const router = createMemoryRouter([{ path: path.replace(/\?.*$/, ''), element }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('For organisations', () => {
  it('says what Thinkerwell is, and plainly that it is not a registered charity', () => {
    renderAt('/organisations', <OrganisationsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'For organisations' })).toBeInTheDocument();
    expect(screen.getByText(/Thinkerwell is a student-led project working to expand access to free digital social studies learning/)).toBeInTheDocument();
    expect(screen.getByText(/It is not a registered charity or nonprofit/)).toBeInTheDocument();
    expect(screen.getByText(/One course, Exploring Our World: 24 lessons .* for learners aged about 10 to 17/)).toBeInTheDocument();
  });

  it('covers what partners get, what we ask, privacy and getting ready', () => {
    renderAt('/organisations', <OrganisationsPage />);
    for (const name of ['What you get', 'What we ask', 'Privacy', 'Get ready']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    const ask = screen.getByRole('region', { name: 'What we ask' });
    expect(within(ask).getByText('One contact person at your organisation.')).toBeInTheDocument();
    expect(within(ask).getByText(/A few sessions a week for 4 to 6 weeks/)).toBeInTheDocument();
    expect(within(ask).getByText(/Honest feedback/)).toBeInTheDocument();
    const privacy = screen.getByRole('region', { name: 'Privacy' });
    expect(within(privacy).getByText(/Pilot groups can use codes instead of names\. Each learner gets a code card/)).toBeInTheDocument();
    expect(within(privacy).getByText(/Parental consent\./)).toBeInTheDocument();
    // Honest about the outside services a learner can reach: never "nothing leaves the device".
    expect(within(privacy).getByText(/learners' work and progress are not sent to Thinkerwell\. Online speech-to-text is off/)).toBeInTheDocument();
    expect(within(privacy).getByText(/They play from YouTube/)).toBeInTheDocument();
    expect(screen.queryByText(/nothing at all leaves the device/)).not.toBeInTheDocument();
    // No contact card, and no placeholder, until there is a real address (src/app/contact.ts).
    expect(screen.queryByRole('heading', { name: 'Contact us' })).not.toBeInTheDocument();
    expect(screen.queryByText(/\[CONTACT EMAIL\]/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Print consent forms' })).toHaveAttribute('href', '/educators/consent-form');
    expect(screen.getByRole('link', { name: 'Make code cards' })).toHaveAttribute('href', '/educators/code-cards');
    expect(screen.getByRole('link', { name: 'Open the checklist' })).toHaveAttribute('href', '/educators/setup');
  });
});

describe('the consent form', () => {
  it('puts the organisation’s name into the form, or a line to write it on', async () => {
    const user = userEvent.setup();
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const form = screen.getByRole('article', { name: 'Taking part in the Thinkerwell pilot' });
    expect(within(form).queryByText('HELP for Refugees')).toBeNull();
    expect(within(form).getAllByText("organisation's name").length).toBeGreaterThan(0);
    await user.type(screen.getByRole('textbox', { name: "Your organisation's name" }), 'HELP for Refugees');
    // Every {organisation} in the form: the introduction, who sees the data (twice), the choice (twice), questions, and who keeps it.
    expect(within(form).getAllByText('HELP for Refugees')).toHaveLength(7);
    expect(form.textContent).not.toContain('{');
    expect(within(form).queryByText("organisation's name")).toBeNull();
  });

  it('says what is and isn’t collected, who sees it, when it is deleted, YouTube, and that it is voluntary', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const form = screen.getByRole('article', { name: 'Taking part in the Thinkerwell pilot' });
    const part = (name: string) => within(form).getByRole('heading', { level: 3, name }).parentElement!;
    expect(part('What is collected')).toHaveTextContent(/Only anonymous data: how long .* which lessons they finish, and their quiz scores/);
    expect(part('What is not collected')).toHaveTextContent(/name, photos .* where your child is, or anything your child writes/);
    expect(part('Who can see it')).toHaveTextContent(/Only the Thinkerwell team/);
    expect(part('When it is deleted')).toHaveTextContent(/deleted within 6 months/);
    expect(part('Videos')).toHaveTextContent(/YouTube \(owned by Google\)/);
    expect(part('It is your choice')).toHaveTextContent(/Taking part is voluntary/);
    expect(within(form).getByText(/student-led project, not a registered charity/)).toBeInTheDocument();
    // No email address yet: "Questions?" sends parents to the organisation, with no placeholder.
    expect(within(form).getByText(/^Questions\? Ask/)).toHaveTextContent(/^Questions\? Ask organisation's name\.$/);
    expect(form.textContent).not.toContain('[CONTACT EMAIL]');
    for (const label of ["Child's name", "Child's code", "Parent or guardian's name", 'Signature', 'Date']) {
      expect(within(form).getByText(label, { selector: 'dt' })).toBeInTheDocument();
    }
  });

  it('shows staff that it is a template, on screen only', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const note = screen.getByRole('complementary', { name: 'For staff: this is a template' });
    expect(note).toHaveTextContent(/not legal advice/);
    expect(note.closest('.tw-no-print')).not.toBeNull();
    expect(screen.getByRole('article').closest('.tw-no-print')).toBeNull();
  });
});

describe('code cards', () => {
  it('makes a card for each learner and a matching list with a space for each name', async () => {
    const user = userEvent.setup();
    const router = renderAt('/educators/code-cards', <CodeCardsPage />);
    // No prefix yet: nothing to print.
    expect(screen.queryByRole('button', { name: 'Print' })).toBeNull();
    const prefix = screen.getByRole('textbox', { name: 'Prefix' });
    await user.type(prefix, 'hlp');
    const count = screen.getByRole('textbox', { name: 'Number of learners' });
    await user.clear(count);
    await user.type(count, '12');

    expect(document.querySelector('.tw-codes-summary')).toHaveTextContent('12 cards, from HLP-01 to HLP-12. Print on A4 and cut along the dashed lines.');
    const cards = [...document.querySelectorAll('.tw-code-card-code')].map((card) => card.textContent);
    expect(cards).toEqual(Array.from({ length: 12 }, (_, i) => `HLP-${String(i + 1).padStart(2, '0')}`));
    expect(document.querySelectorAll('.tw-codes-sheet')).toHaveLength(2);
    expect(screen.getAllByText("Tap “I'm new here” and type this code as your name.")).toHaveLength(12);

    const list = screen.getByRole('table');
    const rows = within(list).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(cards);
    for (const row of rows) expect(within(row).getByRole('cell')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?prefix=HLP&count=12');
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
