import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLessons, getSectionLessons, type Lesson } from '../../content';
import { LearnerSessionProvider } from '../../session';
import { deleteAllData, getStore } from '../../storage';
import { AllCertificatesPage } from './AllCertificatesPage';

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(async () => {
  await deleteAllData();
});

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <LearnerSessionProvider>
            <AllCertificatesPage />
          </LearnerSessionProvider>
        ),
      },
    ],
    { initialEntries: ['/educators/class/certificates'] },
  );
  render(<RouterProvider router={router} />);
}

async function learnerWith(name: string, lessons: readonly Lesson[]): Promise<string> {
  const store = await getStore();
  const { id } = await store.addLearner({ name, colour: 'paper' });
  let day = 1;
  for (const lesson of lessons) {
    const at = new Date(Date.UTC(2026, 8, day++, 10)).toISOString();
    await store.updateProgress(id, lesson.id, (p) => ({ ...p, reflections: { 0: 'An answer.' }, completedAt: at }));
  }
  return id;
}

describe('AllCertificatesPage', { timeout: 20_000 }, () => {
  it("shows every certificate earned on this device, learners by name, each learner's sections then the course", async () => {
    await learnerWith('Yusuf', getLessons());
    await learnerWith('Amina', getSectionLessons('geography'));
    // Four lessons of Culture: not finished, so no certificate.
    await learnerWith('Kofi', getSectionLessons('culture').slice(0, 4));
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'All certificates' })).toBeInTheDocument();
    expect(screen.getByText('6 certificates earned on this device. Each prints on a landscape page of its own.')).toBeInTheDocument();
    const certificates = screen.getAllByRole('article');
    expect(certificates.map((article) => article.getAttribute('aria-label'))).toEqual([
      'Certificate for Amina: Geography & Our Environment',
      'Certificate for Yusuf: History & Human Stories',
      'Certificate for Yusuf: Geography & Our Environment',
      'Certificate for Yusuf: Culture, Society & Identity',
      'Certificate for Yusuf: Civics, Media & Everyday Economics',
      'Course certificate for Yusuf',
    ]);
    // The same certificate as a learner's own, one heading level down, with the name from the device.
    const amina = certificates[0]!;
    expect(amina).toHaveClass('tw-cert');
    expect(within(amina).getByRole('heading', { level: 2, name: 'Certificate' })).toBeInTheDocument();
    expect(within(amina).getByRole('heading', { level: 3 })).toHaveTextContent('Geography & Our Environment');
    expect(within(amina).getByText('Amina')).toHaveClass('tw-cert-name');
    expect(within(amina).getByText('finished the Geography & Our Environment section of Exploring Our World.')).toBeInTheDocument();
    expect(within(certificates[5]!).getByText('finished all 24 lessons of Exploring Our World.')).toBeInTheDocument();
    expect(screen.queryByText('Kofi')).not.toBeInTheDocument();
    // Every id on the page is its own.
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    // Names can't be changed here; the page says where they can.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/Names come from this device and can't be changed here\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the course page' })).toHaveAttribute('href', '/course');
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the class' })).toHaveAttribute('href', '/educators/class');
    // No scores anywhere.
    expect(document.body.textContent).not.toMatch(/score|out of|%/i);
  });

  it('says so when nobody has earned one yet, with nothing to print', async () => {
    await learnerWith('Amina', getSectionLessons('history').slice(0, 8));
    renderPage();
    expect(await screen.findByText('Nobody on this device has a certificate yet.')).toBeInTheDocument();
    expect(screen.getByText("A learner gets one by finishing every lesson in a section. The section check isn't needed.")).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
  });
});
