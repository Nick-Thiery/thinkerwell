import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import en from '../../../../content/pilot-check/en.json';
import { I18nProvider } from '../../../i18n';
import { PilotCheckPage } from './PilotCheckPage';

/** The before-and-after check (/educators/learning-check). */

function renderPage(locale?: string) {
  const router = createMemoryRouter([{ path: '/educators/learning-check', element: <PilotCheckPage /> }], {
    initialEntries: ['/educators/learning-check'],
  });
  const page = <RouterProvider router={router} />;
  render(locale ? <I18nProvider locale={locale}>{page}</I18nProvider> : page);
}

describe('the before-and-after check', () => {
  it('prints the learners’ sheets by default: code and session at the top, 16 questions, the writing and the faces', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Learning check' })).toBeInTheDocument();
    const questions = await screen.findByRole('article', { name: 'Part 1: Questions' });
    expect(within(questions).getByText('My code:')).toBeInTheDocument();
    expect(within(questions).getByText('Write your code, not your name.')).toBeInTheDocument();
    expect(within(questions).getByText(en.questions[0]!.question)).toBeInTheDocument();
    expect(questions.querySelectorAll('.tw-check-question')).toHaveLength(16);
    // Nothing on the learners' sheets gives the answer away.
    expect(within(questions).queryByText('Answer key for the team', { selector: 'h2' })).toBeNull();
    expect(questions.textContent).not.toMatch(/correct/i);

    const writing = screen.getByRole('article', { name: 'Part 2: Writing' });
    expect(writing).toHaveTextContent(en.writing.prompt);
    const faces = screen.getByRole('article', { name: 'Part 3: How sure do you feel?' });
    expect(faces.querySelectorAll('.tw-check-confidence > li')).toHaveLength(5);
    expect(within(faces).getAllByText('Not yet')).toHaveLength(5);
    // No field for a name anywhere.
    expect(screen.queryByText(/name:/i)).toBeNull();
  });

  it('prints the answer key and rubric for the team when that is chosen', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('article', { name: 'Part 1: Questions' });
    await user.click(screen.getByRole('button', { name: 'Answer key for the team' }));
    const key = screen.getByRole('article', { name: 'Before-and-after check: answer key' });
    expect(key).toHaveTextContent('For the Thinkerwell team only');
    const rows = within(key).getAllByRole('table')[0]!.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(16);
    expect(rows[0]).toHaveTextContent(`A ${en.questions[0]!.options[0]!.text}`);
    expect(rows[1]).toHaveTextContent('C');
    expect(within(key).getByRole('columnheader', { name: '2 points' })).toBeInTheDocument();
    expect(within(key).getByRole('columnheader', { name: '1 point' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Part 1: Questions' })).toBeNull();
  });

  it('is in Indonesian on an Indonesian page, questions too', async () => {
    renderPage('id');
    expect(await screen.findByRole('heading', { level: 1, name: 'Cek pembelajaran' })).toBeInTheDocument();
    const questions = await screen.findByRole('article', { name: 'Bagian 1: Pertanyaan' });
    expect(await within(questions).findByText('Bagian peta mana yang menjelaskan arti setiap simbol?')).toBeInTheDocument();
    expect(within(questions).getByText('Legenda')).toBeInTheDocument();
    expect(questions.querySelector('[lang="en"]')).toBeNull();
  });

  it('is in Malay on a Malay page', async () => {
    renderPage('ms');
    const questions = await screen.findByRole('article', { name: 'Bahagian 1: Soalan' });
    expect(await within(questions).findByText('Bahagian peta yang manakah menerangkan maksud setiap simbol?')).toBeInTheDocument();
  });
});
