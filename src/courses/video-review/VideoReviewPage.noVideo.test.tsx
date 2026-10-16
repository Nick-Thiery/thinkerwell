import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { routes } from '../../app/routes';
import { deleteAllData, getStore } from '../../storage';

// A lesson with no suggested video in the language (every lesson has one today,
// so the real candidates can't show it): it says learners keep the English video
// and offers no answer.
vi.mock('virtual:thinkerwell/video-review', () => ({
  default: { ms: [{ key: 'L01', recommended: null, alsoSuitable: [], notChecked: [], approved: false }] },
}));

afterEach(async () => {
  await deleteAllData();
});

it('a lesson with no suggested video says learners keep the English one', async () => {
  await (await getStore()).updateSettings({ language: 'ms' });
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/review/videos?lesson=L01'] })} />);
  expect(await screen.findByRole('heading', { level: 1, name: 'Video Tonton dalam Bahasa Melayu' })).toBeInTheDocument();
  expect(screen.getByText(/Kami belum menjumpai video yang baik dalam Bahasa Melayu untuk pelajaran ini/)).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Jawapan kamu' })).toBeNull();
});
