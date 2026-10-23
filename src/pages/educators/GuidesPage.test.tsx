import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { getSectionLessons, getSections } from '../../content';
import { I18nProvider } from '../../i18n';
import { GuidesPage } from './GuidesPage';

/** Teacher guides and answer keys (/educators/guides): the list the Educators page links to. */

function renderAt(path = '/educators/guides', locale?: string) {
  const router = createMemoryRouter([{ path: '/educators/guides', element: <GuidesPage /> }], { initialEntries: [path] });
  const page = <RouterProvider router={router} />;
  render(locale ? <I18nProvider locale={locale}>{page}</I18nProvider> : page);
}

describe('the list of teacher guides', () => {
  it('has the four sections folded, each with its icon, name and lesson numbers', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Teacher guides and answer keys' })).toBeInTheDocument();
    const folds = document.querySelectorAll('details.tw-guides-section');
    expect(folds).toHaveLength(4);
    for (const fold of folds) expect(fold).not.toHaveAttribute('open');
    expect(folds[0]).toHaveTextContent('History & Human Stories');
    expect(folds[0]).toHaveTextContent('Lessons 1–9');
    expect(screen.getByRole('link', { name: 'Back to the educators page' })).toHaveAttribute('href', '/educators');
  });

  it.each(getSections().map((section) => [section.id, section] as const))('%s: every lesson’s teacher guide and print view, then the answer key', (id, section) => {
    renderAt(`/educators/guides?section=${id}`);
    const fold = document.querySelector(`details.tw-guides-${id}`) as HTMLElement;
    expect(fold).toHaveAttribute('open');
    for (const lesson of getSectionLessons(id)) {
      expect(within(fold).getByText(`Lesson ${lesson.number}: ${lesson.title}`)).toBeInTheDocument();
      expect(within(fold).getByRole('link', { name: `Teacher guide for Lesson ${lesson.number}` })).toHaveAttribute('href', `/educators/lesson/${lesson.id}`);
      expect(within(fold).getByRole('link', { name: `Print Lesson ${lesson.number}` })).toHaveAttribute('href', `/lesson/${lesson.id}/print`);
    }
    expect(within(fold).getAllByRole('link', { name: /^Teacher guide for Lesson/ })).toHaveLength(section.lessons.length);
    expect(within(fold).getByRole('link', { name: `Answer key for the ${section.title} section check` })).toHaveAttribute('href', `/educators/section/${id}/answers`);
  });

  it('is in Indonesian on an Indonesian page, with the lessons in Indonesian too', async () => {
    renderAt('/educators/guides?section=geography', 'id');
    expect(await screen.findByRole('heading', { level: 1, name: 'Panduan guru dan kunci jawaban' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke halaman pendidik' })).toBeInTheDocument();
  });
});
