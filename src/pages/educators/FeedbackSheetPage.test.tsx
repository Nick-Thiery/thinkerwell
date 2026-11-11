import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FeedbackSheetPage } from './FeedbackSheetPage';

/** The session record and feedback sheet (/educators/feedback-sheet): on paper, nothing sent, no learner's name. */

function renderPage() {
  const router = createMemoryRouter([{ path: '/educators/feedback-sheet', element: <FeedbackSheetPage /> }], {
    initialEntries: ['/educators/feedback-sheet'],
  });
  render(<RouterProvider router={router} />);
  return screen.getByRole('article', { name: 'Session record and feedback' });
}

describe('the session record and feedback sheet', () => {
  it('asks about the group, what it used, the checks, and how it went, in that order', () => {
    const sheet = renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Session record and feedback' })).toBeInTheDocument();
    expect(within(sheet).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Your group',
      'What your group used',
      'Checks',
      'How it went',
    ]);
  });

  it('has a row for every course, Our World first, to write lesson numbers and sessions against', () => {
    const sheet = renderPage();
    const table = within(sheet).getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Exploring Our World',
      'Digital World',
      'Southeast Asia Through Time',
      'Art, Architecture and Society',
    ]);
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Course', 'Lesson numbers used', 'Sessions']);
  });

  it('asks about ease, switching courses, content, interest and practical trouble', () => {
    const sheet = renderPage();
    expect(sheet).not.toHaveTextContent('learning check');
    for (const question of [
      'Was Thinkerwell easy to use?',
      'Was it clear how to move between courses?',
      'Were the lessons right for your learners?',
      'Did the learners stay interested?',
      'What got in the way?',
    ]) {
      expect(sheet).toHaveTextContent(question);
    }
  });

  it('never asks for a learner’s name, and has no fields that send or save anything', () => {
    const sheet = renderPage();
    expect(sheet).toHaveTextContent("Don't write learners' names, or anything they wrote or said.");
    expect(sheet.querySelector('input, textarea, select, form')).toBeNull();
    expect(screen.getByRole('link', { name: 'Send us your answers' })).toHaveAttribute('href', '/contact');
  });
});
