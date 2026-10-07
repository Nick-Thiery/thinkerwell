import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { OrganisationsPage } from '../OrganisationsPage';
import { CodeCardsPage } from './CodeCardsPage';
import { ConsentFormPage } from './ConsentFormPage';
import { InformationSheetPage } from './InformationSheetPage';

/** The partner kit: For organisations, the information sheet, the consent form and code cards. */

function renderAt(path: string, element: React.ReactElement) {
  const router = createMemoryRouter([{ path: path.replace(/\?.*$/, ''), element }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('For organisations', () => {
  it('says what Thinkerwell is, and plainly that it is not a registered charity', () => {
    renderAt('/organisations', <OrganisationsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'For organisations' })).toBeInTheDocument();
    expect(screen.getByText(/Thinkerwell is a student-led platform working to expand access to free digital social studies learning/)).toBeInTheDocument();
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
    expect(within(privacy).getByText(/a parent or guardian signs a consent form, and the learner says yes too/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Print information sheets' })).toHaveAttribute('href', '/educators/information-sheet');
    expect(screen.getByRole('link', { name: 'Print consent forms' })).toHaveAttribute('href', '/educators/consent-form');
    expect(screen.getByRole('link', { name: 'Make code cards' })).toHaveAttribute('href', '/educators/code-cards');
    expect(screen.getByRole('link', { name: 'Open the checklist' })).toHaveAttribute('href', '/educators/setup');
  });
});

/** The study and what is kept: the same words on the form and the sheet (./pilotStudy.tsx). */
const STUDY = [
  /answers 16 short questions \(about 15 minutes each time\)/,
  /writes a few sentences about a made-up town, on paper \(about 8 minutes\)/,
  /chooses a face for each of 5 sentences/,
  // Everything the pilot's measurement logs in every session (docs/research/MEASUREMENT_PLAN.md, section 4).
  /In every session, Thinkerwell also notes how your child uses it: how long, which lessons and steps they open and finish, their answers to quick checks and quizzes, whether they use the simpler reading or have it read aloud, whether they watch the videos \(and how much\) or read instead, and how many words they write, never the words themselves\./,
  /None of this is a test\. Nothing depends on the answers\./,
];
const KEPT = [
  /linked to a code, like HLP-01, never to their name/,
  /keeps the list of names and codes on paper\. Thinkerwell never sees it\./,
  /never asks about family, journey, home country, religion or ethnicity/,
  /never asks for UNHCR numbers or any documents/,
  /never collects photos of your child, or where they are/,
  /writes and records in the lessons stays on the device they use/,
  /Only the Thinkerwell team sees the answers\. .* gets results for the whole group, never for one child\./,
  /deleted within 6 months after the pilot ends/,
  /When one plays, YouTube \(owned by Google\) gets some information.* choosing “Read instead” sends nothing to YouTube/,
];

/** A part of a printed page, by its heading. */
function part(page: HTMLElement, name: string): HTMLElement {
  return within(page).getByRole('heading', { level: 3, name }).parentElement!;
}

describe('the consent form', () => {
  const pages = () => screen.getAllByRole('article');

  it('is two pages, each headed with the form’s title, the page number and a line for the pilot code', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const [parent, learner] = pages();
    expect(pages()).toHaveLength(2);
    expect(parent).toHaveAccessibleName('Taking part in the Thinkerwell pilot');
    expect(learner).toHaveAccessibleName('Taking part in the Thinkerwell pilot For staff to fill in');
    for (const [page, number] of [
      [parent!, 1],
      [learner!, 2],
    ] as const) {
      expect(within(page).getByRole('heading', { level: 2 })).toHaveTextContent('Taking part in the Thinkerwell pilot');
      expect(within(page).getByText(`Page ${number} of 2`)).toBeInTheDocument();
      expect(within(page).getByText(/^Pilot code \(the organisation fills this in\):/)).toBeInTheDocument();
    }
    expect(within(parent!).getByText('For a parent or guardian')).toBeInTheDocument();
  });

  it('puts the organisation’s name into the form, or a line to write it on', async () => {
    const user = userEvent.setup();
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const [parent, learner] = pages();
    expect(screen.queryByText('HELP for Refugees')).toBeNull();
    expect(within(parent!).getAllByText("organisation's name").length).toBeGreaterThan(0);
    await user.type(screen.getByRole('textbox', { name: "Your organisation's name" }), 'HELP for Refugees');
    // Every {organisation} on the parent's page: the introduction, what is kept (twice), the choice
    // (twice), questions, the first question and who keeps the form; and who keeps it, on the second.
    expect(within(parent!).getAllByText('HELP for Refugees')).toHaveLength(8);
    expect(within(learner!).getAllByText('HELP for Refugees')).toHaveLength(1);
    for (const name of screen.getAllByText('HELP for Refugees')) expect(name).toHaveAttribute('translate', 'no');
    expect(parent!.textContent + learner!.textContent).not.toContain('{');
    expect(screen.queryByText("organisation's name")).toBeNull();
  });

  it('says what the study involves, what is kept and what isn’t, and that it is the family’s choice', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const parentPage = pages()[0]!;
    const parent = within(parentPage);
    expect(parent.getByText(/is trying Thinkerwell, a free online course .* for youth aged about 10 to 17/)).toBeInTheDocument();
    const study = part(parentPage, 'The pilot study');
    expect(study).toHaveTextContent(/If you say yes to the study, then in the first and last sessions your child:/);
    for (const line of STUDY) expect(study).toHaveTextContent(line);
    const kept = part(parentPage, "What we keep, and what we don't");
    for (const line of KEPT) expect(kept).toHaveTextContent(line);
    expect(within(kept).getAllByRole('listitem')).toHaveLength(KEPT.length);
    const choice = part(parentPage, 'It is your choice');
    expect(choice).toHaveTextContent(/Saying no to either question below won't affect anything else your child does at/);
    expect(choice).toHaveTextContent(/If you say no to the study, your child can still use Thinkerwell in class/);
    expect(choice).toHaveTextContent(/change your mind at any time, even after the pilot: tell .*, and your child's answers are deleted/);
    expect(choice).toHaveTextContent(/Your child can say no too, and their no counts\./);
    expect(parent.getByText(/student-led platform, not a registered charity/)).toBeInTheDocument();
    // No email address yet: "Questions?" sends parents to the organisation, with no placeholder.
    expect(parent.getByText(/^Questions\? Ask/)).toHaveTextContent(/^Questions\? Ask organisation's name\.$/);
    expect(pages()[0]!.textContent).not.toContain('[CONTACT EMAIL]');
  });

  it('asks the two questions separately, each with a Yes and a No, then a signature or thumbprint', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const answers = screen.getByRole('region', { name: 'Your answers' });
    const questions = within(answers).getAllByRole('listitem').filter((item) => item.parentElement!.tagName === 'OL');
    expect(questions.map((item) => item.querySelector('p')!.textContent)).toEqual([
      "My child can use Thinkerwell in class at organisation's name.",
      'My child can take part in the pilot study. Their answers are used with a code, never their name.',
    ]);
    for (const question of questions) {
      expect(within(question).getAllByRole('listitem').map((choice) => choice.textContent)).toEqual(['Yes', 'No']);
    }
    for (const label of ["Child's name", "Parent or guardian's name", 'Date', 'Signature or thumbprint']) {
      expect(within(answers).getByText(label, { selector: 'dt' })).toBeInTheDocument();
    }
    expect(answers).toHaveTextContent(/keeps this form somewhere locked\. Thinkerwell never sees it\./);
  });

  it('has the learner’s own answer and the witness line on the second page', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const learnerPage = within(pages()[1]!);
    expect(learnerPage.getByText("Child's name", { selector: 'dt' })).toBeInTheDocument();
    const learner = learnerPage.getByRole('region', { name: "The learner's own answer" });
    expect(learner).toHaveTextContent(/Read this aloud to the learner, in their language:/);
    expect(within(learner).getByText(/^We're trying a new learning website called Thinkerwell\./)).toHaveTextContent(
      /It isn't a test, and nobody gets a mark\. We use a number, not your name\. You can say no, or stop at any time, and you can still use Thinkerwell and come to class\. Do you want your answers to be part of the study\?$/,
    );
    expect(within(learner).getAllByRole('listitem').map((choice) => choice.textContent)).toEqual(['Yes', 'No']);
    expect(within(learner).getByText('Staff initials', { selector: 'dt' })).toBeInTheDocument();
    expect(within(learner).getByText("If the parent says yes and the learner says no, the learner's no wins.")).toBeInTheDocument();
    const witness = learnerPage.getByRole('region', { name: "If the parent or guardian can't read or write" });
    expect(witness).toHaveTextContent(
      /^If the parent or guardian can't read or writeI read the information sheet and this form aloud in language \(language\)\. The parent or guardian understood and gave the answers on page 1\./,
    );
    for (const label of ["Staff member's name", "Staff member's signature", 'Date']) {
      expect(within(witness).getByText(label, { selector: 'dt' })).toBeInTheDocument();
    }
    expect(learnerPage.getByText(/keeps this form somewhere locked\. Thinkerwell never sees it\./)).toBeInTheDocument();
  });

  it('shows staff that it is a template, and how to use it, on screen only', () => {
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const note = screen.getByRole('complementary', { name: 'For staff: this is a template' });
    expect(note).toHaveTextContent(/not legal advice/);
    expect(note).toHaveTextContent(/Give each family the information sheet with the form/);
    expect(note).toHaveTextContent(/Learners aged 18 or older sign for themselves\./);
    expect(note).toHaveTextContent(/doesn't cover online speech-to-text/);
    expect(note.closest('.tw-no-print')).not.toBeNull();
    for (const page of pages()) expect(page.closest('.tw-no-print')).toBeNull();
  });
});

describe('the information sheet', () => {
  it('puts what staff typed into the sheet, or lines to write it on', async () => {
    const user = userEvent.setup();
    renderAt('/educators/information-sheet', <InformationSheetPage />);
    const sheet = screen.getByRole('article', { name: 'About the Thinkerwell pilot' });
    const happen = part(sheet, 'What will happen?');
    expect(happen).toHaveTextContent(
      "From start date to end date, your child's class at organisation's name will use Thinkerwell on its tablets and laptops, about number of sessions times. A teacher from organisation's name leads every session.",
    );
    expect(part(sheet, 'Questions')).toHaveTextContent(/^QuestionsAsk contact person's name at organisation's name\./);

    for (const [label, value] of [
      ["Your organisation's name", 'HELP for Refugees'],
      ['Start date', '13 October 2026'],
      ['End date', '21 November 2026'],
      ['Number of sessions', '12'],
      ['Contact person', 'Sari'],
    ] as const) {
      await user.type(screen.getByRole('textbox', { name: label }), value);
    }
    expect(happen).toHaveTextContent(
      "From 13 October 2026 to 21 November 2026, your child's class at HELP for Refugees will use Thinkerwell on its tablets and laptops, about 12 times. A teacher from HELP for Refugees leads every session.",
    );
    expect(part(sheet, 'Questions')).toHaveTextContent(/^QuestionsAsk Sari at HELP for Refugees\./);
    for (const value of ['13 October 2026', '21 November 2026', '12', 'Sari']) {
      expect(within(sheet).getByText(value)).toHaveAttribute('translate', 'no');
    }
    expect(within(sheet).getAllByText('HELP for Refugees')).toHaveLength(5);
    expect(sheet.textContent).not.toContain('{');
  });

  it('says what Thinkerwell is, what will happen, the study, what is kept, the choice and whom to ask', () => {
    renderAt('/educators/information-sheet', <InformationSheetPage />);
    const sheetPage = screen.getByRole('article', { name: 'About the Thinkerwell pilot' });
    expect(part(sheetPage, 'What is Thinkerwell?')).toHaveTextContent(
      /Thinkerwell is a free learning website\. .* in simple English or Bahasa Indonesia\. It is made by a small team of students in Singapore\./,
    );
    const study = part(sheetPage, 'The pilot study: you choose');
    for (const line of STUDY) expect(study).toHaveTextContent(line);
    const kept = part(sheetPage, "What we keep, and what we don't");
    for (const line of KEPT) expect(kept).toHaveTextContent(line);
    const choice = part(sheetPage, 'Saying yes or no');
    expect(choice).toHaveTextContent(/It is your choice, and you answer on the consent form\./);
    expect(choice).toHaveTextContent(/If you say no to the study, your child still comes to class and can still use Thinkerwell\./);
    expect(choice).toHaveTextContent(/even after the pilot\. Tell a teacher, and your child's answers are deleted\./);
    expect(choice).toHaveTextContent(/Your child can also say no, and their no counts\./);
    const questions = part(sheetPage, 'Questions');
    expect(questions).toHaveTextContent(/Thinkerwell is run by Justin Park and Nick Thiery\. It is a student-led platform, not a registered charity\./);
    // No email address yet (src/app/contact.ts): no placeholder, and no "write to Thinkerwell".
    expect(questions).not.toHaveTextContent(/write to Thinkerwell|\[/);
  });

  it('makes the same promises as the consent form, in the same words', () => {
    renderAt('/educators/information-sheet', <InformationSheetPage />);
    const sheetKept = part(screen.getByRole('article'), "What we keep, and what we don't").querySelector('ul')!.innerHTML;
    const sheetStudy = part(screen.getByRole('article'), 'The pilot study: you choose').querySelector('ul')!.innerHTML;
    cleanup();
    renderAt('/educators/consent-form', <ConsentFormPage />);
    const form = screen.getAllByRole('article')[0]!;
    expect(part(form, "What we keep, and what we don't").querySelector('ul')!.innerHTML).toBe(sheetKept);
    expect(part(form, 'The pilot study').querySelector('ul')!.innerHTML).toBe(sheetStudy);
  });

  it('shows staff that it is a template, on screen only', () => {
    renderAt('/educators/information-sheet', <InformationSheetPage />);
    const note = screen.getByRole('complementary', { name: 'For staff: this is a template' });
    expect(note).toHaveTextContent(/not legal advice/);
    expect(note.closest('.tw-no-print')).not.toBeNull();
    expect(screen.getByRole('group', { name: 'Before you print' }).closest('.tw-no-print')).not.toBeNull();
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
