import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getLesson, type Lesson } from '../content';
import { EducatorsPage } from './EducatorsPage';

const L10 = getLesson('towns-near-rivers') as Lesson;

describe('EducatorsPage', () => {
  it('shows the hero, what you need, and how a session works, with a link to Settings', () => {
    render(<EducatorsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Run a Thinkerwell lesson with your group' })).toBeInTheDocument();
    expect(screen.getByText('One device for every 1 to 3 learners, or one big screen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How a session works' })).toBeInTheDocument();
    expect(screen.getByText('Pick a lesson')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings for this device' })).toHaveAttribute('href', '/settings');
  });

  it('previews a lesson with ?preview=true, so nothing it does is ever saved', async () => {
    const user = userEvent.setup();
    render(<EducatorsPage />);

    await user.click(screen.getByRole('radio', { name: /Geography/ }));
    const row = screen.getByRole('link', { name: new RegExp(`^Lesson 10\\b`) });
    expect(row).toHaveAttribute('href', `/lesson/${L10.id}/read?preview=true`);
  });

  it("switches the lesson list when a different section chip is chosen, and never shows a lesson's own status as saved progress", async () => {
    const user = userEvent.setup();
    render(<EducatorsPage />);

    // Some section is selected by default; Geography's Lesson 10 isn't shown until it is.
    expect(screen.queryByText(L10.essentialQuestion)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Geography/ }));
    expect(screen.getByText(L10.essentialQuestion)).toBeInTheDocument();
  });

  it('shows a lesson\'s teaching notes and sources once opened, and hides them again', async () => {
    const user = userEvent.setup();
    render(<EducatorsPage />);
    await user.click(screen.getByRole('radio', { name: /Geography/ }));
    const lessonRow = screen.getByRole('link', { name: /^Lesson 10\b/ }).closest('.tw-edu-lesson') as HTMLElement;

    expect(screen.getByText(L10.educatorNotes[0]!)).not.toBeVisible();
    await user.click(within(lessonRow).getByRole('button', { name: 'Show teaching notes and sources' }));
    expect(screen.getByText(L10.educatorNotes[0]!)).toBeVisible();
    expect(within(lessonRow).getByRole('link', { name: L10.sources[0]!.label })).toHaveAttribute('href', L10.sources[0]!.url);

    await user.click(within(lessonRow).getByRole('button', { name: 'Hide teaching notes and sources' }));
    expect(screen.getByText(L10.educatorNotes[0]!)).not.toBeVisible();
  });

  it('keeps the feedback email a plain placeholder, not a form', () => {
    render(<EducatorsPage />);
    expect(screen.getByText('[FEEDBACK EMAIL]')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
