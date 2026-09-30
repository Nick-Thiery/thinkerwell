import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { getLesson, getSectionLessons, getSections, type Lesson } from '../content';
import { EducatorsPage } from './EducatorsPage';

const L10 = getLesson('towns-near-rivers') as Lesson;

function renderAt(path = '/educators') {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  const router = createMemoryRouter([{ path: '/educators', element: <EducatorsPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('EducatorsPage', () => {
  it('shows the hero, what you need, and how a session works, with a link to Settings', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'For educators' })).toBeInTheDocument();
    expect(screen.getByText('Run a Thinkerwell lesson with your group')).toBeInTheDocument();
    expect(screen.getByText('One device for every 1 to 3 learners, or one big screen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How a session works' })).toBeInTheDocument();
    expect(screen.getByText('Pick a lesson')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings for this device' })).toHaveAttribute('href', '/settings');
  });

  it('links everything for starting a pilot, then the tools for following the group', () => {
    renderAt();
    const pilot = screen.getByRole('region', { name: 'Starting a pilot' });
    expect(within(pilot).getAllByRole('listitem').map((item) => item.querySelector('.tw-edu-check-title')?.textContent)).toEqual([
      'For organisations',
      'Consent form',
      'Code cards',
      'Set up this device',
    ]);
    expect(within(pilot).getByRole('link', { name: 'Read about pilots' })).toHaveAttribute('href', '/organisations');
    expect(within(pilot).getByRole('link', { name: 'Print consent forms' })).toHaveAttribute('href', '/educators/consent-form');
    expect(within(pilot).getByRole('link', { name: 'Make code cards' })).toHaveAttribute('href', '/educators/code-cards');
    expect(within(pilot).getByRole('link', { name: 'Open the checklist' })).toHaveAttribute('href', '/educators/setup');

    const tools = screen.getByRole('region', { name: 'Follow your group' });
    expect(within(tools).getAllByRole('listitem').map((item) => item.querySelector('.tw-edu-check-title')?.textContent)).toEqual([
      'The class on this device',
      'Certificates',
    ]);
    expect(within(tools).getByRole('link', { name: 'See the class' })).toHaveAttribute('href', '/educators/class');
    expect(within(tools).getByRole('link', { name: 'Print all certificates' })).toHaveAttribute('href', '/educators/class/certificates');
  });

  it('previews a lesson with ?preview=true, so nothing it does is ever saved', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('radio', { name: /Geography/ }));
    const row = screen.getByRole('link', { name: new RegExp(`^Lesson 10\\b`) });
    expect(row).toHaveAttribute('href', `/lesson/${L10.id}/read?preview=true`);
  });

  it("switches the lesson list when a different section chip is chosen, and keeps the choice in the address", async () => {
    const user = userEvent.setup();
    const router = renderAt();

    // History is chosen at first; Geography's Lesson 10 isn't shown until it is.
    expect(screen.getByRole('radio', { name: /History/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText(L10.essentialQuestion)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Geography/ }));
    expect(screen.getByText(L10.essentialQuestion)).toBeInTheDocument();
    expect(router.state.location.search).toBe('?section=geography');
    // Replaced, not pushed, so Back leaves the page rather than stepping through chips.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('opens on the section in the address', () => {
    renderAt('/educators?section=civics');
    expect(screen.getByRole('radio', { name: /Civics/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('link', { name: /^Lesson 20\b/ })).toBeInTheDocument();
  });

  it('falls back to the first section for an unknown one', () => {
    renderAt('/educators?section=nope');
    expect(screen.getByRole('radio', { name: /History/ })).toHaveAttribute('aria-checked', 'true');
  });

  it.each(getSections().map((section) => [section.id, section] as const))(
    '%s: each lesson has its teacher guide, and the section its answer key',
    (id, section) => {
      renderAt(`/educators?section=${id}`);
      for (const lesson of getSectionLessons(id)) {
        const guide = screen.getByRole('link', { name: `Teacher guide for Lesson ${lesson.number}` });
        expect(guide).toHaveAttribute('href', `/educators/lesson/${lesson.id}`);
        expect(guide).toHaveTextContent('Teacher guide');
      }
      expect(screen.getAllByRole('link', { name: /^Teacher guide for Lesson/ })).toHaveLength(section.lessons.length);
      const key = screen.getByRole('link', { name: `Answer key for the ${section.title} section check` });
      expect(key).toHaveAttribute('href', `/educators/section/${id}/answers`);
      expect(key).toHaveTextContent('Answer key');
      expect(screen.getByText(`Section check: ${section.title}`)).toBeInTheDocument();
    },
  );

  it('no longer repeats the notes on the page: they are in each teacher guide', () => {
    renderAt('/educators?section=geography');
    expect(screen.queryByText(L10.sensitiveNotes[0]!)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /teaching notes/ })).not.toBeInTheDocument();
  });

  it('keeps the feedback email a plain placeholder, not a form', () => {
    renderAt();
    expect(screen.getByText('[FEEDBACK EMAIL]')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('lists every lesson row within its section', () => {
    renderAt('/educators?section=culture');
    const rows = document.querySelectorAll('.tw-edu-lesson');
    expect(rows).toHaveLength(5);
    expect(within(rows[0] as HTMLElement).getByRole('link', { name: /^Lesson 15\b/ })).toBeInTheDocument();
  });
});
